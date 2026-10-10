import { NextRequest, NextResponse } from "next/server";
import exifr from "exifr";
import fs from "fs";
import os from "os";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

function parseCoordinate(val: any, ref?: string | null): number | null {
  if (typeof val === "number" && !isNaN(val)) {
    let num = val;
    if (ref === "S" || ref === "W") num = -Math.abs(num);
    return num;
  }
  if (Array.isArray(val) && val.length >= 2) {
    const parseItem = (item: any): number => {
      if (typeof item === "number") return item;
      if (Array.isArray(item) && item.length === 2 && item[1] !== 0) return item[0] / item[1];
      if (typeof item === "string") {
        if (item.includes("/")) {
          const [n, d] = item.split("/").map(Number);
          return d ? n / d : 0;
        }
        return Number(item) || 0;
      }
      return Number(item) || 0;
    };
    const deg = parseItem(val[0]);
    const min = parseItem(val[1]);
    const sec = val.length >= 3 ? parseItem(val[2]) : 0;
    let res = deg + min / 60 + sec / 3600;
    if (ref === "S" || ref === "W") res = -Math.abs(res);
    return res;
  }
  if (typeof val === "string") {
    const clean = val.trim();
    const isNegative =
      ref === "S" ||
      ref === "W" ||
      clean.endsWith("S") ||
      clean.endsWith("W") ||
      clean.includes("S") ||
      clean.includes("W");
    const directNum = parseFloat(clean);
    if (
      !isNaN(directNum) &&
      !clean.includes("/") &&
      !clean.includes(",") &&
      !clean.includes(" ") &&
      !clean.includes("°")
    ) {
      let num = directNum;
      if (isNegative) num = -Math.abs(num);
      return num;
    }
    const sanitized = clean.replace(/[^0-9./]/g, " ").trim();
    const parts = sanitized.split(/\s+/).filter(Boolean);
    if (parts.length >= 3) {
      const parseFraction = (s: string) => {
        if (s.includes("/")) {
          const [n, d] = s.split("/").map(Number);
          return d ? n / d : 0;
        }
        return Number(s) || 0;
      };
      const deg = parseFraction(parts[0]);
      const min = parseFraction(parts[1]);
      const sec = parseFraction(parts[2]);
      let res = deg + min / 60 + sec / 3600;
      if (isNegative) res = -Math.abs(res);
      return res;
    }
  }
  return null;
}

export async function POST(request: NextRequest) {
  let tempFilePath: string | null = null;
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || typeof file !== "object" || !("arrayBuffer" in file)) {
      return NextResponse.json({ success: false, error: "No image file provided" }, { status: 400 });
    }

    const arrayBuffer = await (file as File).arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // -------------------------------------------------------------------------
    // Strategy 1: EXIF / XMP Metadata (instant, < 5ms)
    // -------------------------------------------------------------------------
    let quickGps: any = null;
    try {
      quickGps = await exifr.gps(buffer);
    } catch {
      // Continue
    }

    let rawExif: any = null;
    try {
      rawExif = await exifr.parse(buffer, {
        tiff: true,
        xmp: true,
        gps: true,
        jfif: false,
        ihdr: true,
        mergeOutput: true,
      });
    } catch {
      // Continue
    }

    let exifLat: number | null = null;
    let exifLng: number | null = null;

    if (
      quickGps &&
      typeof quickGps.latitude === "number" &&
      typeof quickGps.longitude === "number" &&
      !isNaN(quickGps.latitude) &&
      !isNaN(quickGps.longitude)
    ) {
      exifLat = quickGps.latitude;
      exifLng = quickGps.longitude;
    } else if (rawExif) {
      if (typeof rawExif.latitude === "number" && typeof rawExif.longitude === "number") {
        exifLat = rawExif.latitude;
        exifLng = rawExif.longitude;
      } else if (rawExif.GPSLatitude && rawExif.GPSLongitude) {
        exifLat = parseCoordinate(rawExif.GPSLatitude, rawExif.GPSLatitudeRef);
        exifLng = parseCoordinate(rawExif.GPSLongitude, rawExif.GPSLongitudeRef);
      }
    }

    if (
      exifLat !== null &&
      exifLng !== null &&
      !isNaN(exifLat) &&
      !isNaN(exifLng) &&
      Math.abs(exifLat) <= 90 &&
      Math.abs(exifLng) <= 180
    ) {
      return NextResponse.json({
        success: true,
        is_geotagged: true,
        latitude: exifLat,
        longitude: exifLng,
        location_name: null,
        confidence: 1.0,
        source: "exif_verified",
        model: process.env.LLM_MODEL || "gemma4:e2b",
      });
    }

    // -------------------------------------------------------------------------
    // Strategy 2: Visual Geotag / OCR (for GPS Map Camera & stamped coordinates)
    // -------------------------------------------------------------------------
    const tempDir = os.tmpdir();
    tempFilePath = path.join(tempDir, `geotag-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.jpg`);
    fs.writeFileSync(tempFilePath, buffer);

    const scriptPath = path.join(process.cwd(), "scripts", "extract-watermark.js");

    try {
      const { stdout } = await execFileAsync("node", [scriptPath, tempFilePath], {
        timeout: 12000,
        windowsHide: true,
      });

      const ocrResult = JSON.parse(stdout.trim());
      if (
        ocrResult &&
        ocrResult.found &&
        typeof ocrResult.lat === "number" &&
        typeof ocrResult.lng === "number" &&
        !isNaN(ocrResult.lat) &&
        !isNaN(ocrResult.lng) &&
        Math.abs(ocrResult.lat) <= 90 &&
        Math.abs(ocrResult.lng) <= 180
      ) {
        return NextResponse.json({
          success: true,
          is_geotagged: true,
          latitude: ocrResult.lat,
          longitude: ocrResult.lng,
          location_name: ocrResult.address || null,
          confidence: 0.99,
          source: "gps_camera_watermark",
          model: process.env.LLM_MODEL || "gemma4:e2b",
        });
      }
    } catch (scriptErr: any) {
      console.warn("Visual OCR geotag execution notice:", scriptErr?.message);
    }

    // -------------------------------------------------------------------------
    // Strategy 3: LLM Vision Extractor (Gemma)
    // -------------------------------------------------------------------------
    const llmBaseUrl = process.env.LLM_BASE_URL;
    const llmModel = process.env.LLM_MODEL || "gemma4:e2b";

    if (llmBaseUrl) {
      try {
        const base64Image = buffer.toString("base64");
        
        const response = await fetch(`${llmBaseUrl.replace(/\/$/, '')}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.LLM_API_KEY || "dummy"}`,
          },
          body: JSON.stringify({
            model: llmModel,
            messages: [
              {
                role: "user",
                content: [
                  { 
                    type: "text", 
                    text: "Extract the GPS coordinates (Latitude and Longitude) from this image watermark if present. Respond with ONLY valid JSON: {\"lat\": number, \"lng\": number}. If no coordinates are visible, return {\"error\": \"not found\"}." 
                  },
                  { 
                    type: "image_url", 
                    image_url: { url: `data:image/jpeg;base64,${base64Image}` } 
                  }
                ]
              }
            ],
            response_format: { type: "json_object" }
          }),
          signal: AbortSignal.timeout(15000)
        });

        if (response.ok) {
          const result = await response.json();
          const content = result.choices?.[0]?.message?.content;
          if (content) {
            const parsed = JSON.parse(content);
            if (typeof parsed.lat === "number" && typeof parsed.lng === "number" && !isNaN(parsed.lat) && !isNaN(parsed.lng)) {
              return NextResponse.json({
                success: true,
                is_geotagged: true,
                latitude: parsed.lat,
                longitude: parsed.lng,
                location_name: parsed.address || null,
                confidence: 0.85,
                source: "llm_vision_extracted",
                model: llmModel,
              });
            }
          }
        }
      } catch (llmErr: any) {
        console.warn("LLM Vision extraction failed:", llmErr?.message);
      }
    }

    // -------------------------------------------------------------------------
    // If neither EXIF, OCR, nor LLM Vision found geotag -> Return clear error
    // -------------------------------------------------------------------------
    return NextResponse.json({
      success: false,
      is_geotagged: false,
      error: "This photo does not contain geotag location metadata. Please upload a geotagged photo or use the Take Picture option.",
    });
  } catch (err: any) {
    console.error("Geotag extraction endpoint error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to process image metadata", details: err?.message },
      { status: 500 },
    );
  } finally {
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch {
        // Ignore cleanup error
      }
    }
  }
}
