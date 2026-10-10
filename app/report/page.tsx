"use client";

/**
 * Public Incident Observation Reporting Flow (/report)
 *
 * 3-Step Guided Form:
 * Step 1: Photo and location (camera viewfinder, GPS lock, gallery upload, manual pin, or photo skip)
 * Step 2: Details (category chips, required description 10-1000 chars, urgency radio cards, optional contact)
 * Step 3: Review and submit (summary card with photo, location, category, urgency, description, edit links)
 *
 * Preserves state between steps and recovers text fields from sessionStorage across refreshes.
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import exifr from "exifr";
import { Button, Input, Textarea, Alert, Badge } from "@/components/ui";
import { MapThumbnail, LocationPicker } from "@/components/map";
import { getBrowserSupabase } from "@/src/lib/supabase/client";
import {
  Camera,
  Upload,
  MapPin,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Shield,
  FileText,
  User,
  Phone,
  Edit2,
  Info,
  Image as ImageIcon,
} from "lucide-react";

type FlowStep = 1 | 2 | 3;
type CameraStatus = "idle" | "requesting" | "active" | "denied" | "unsupported";
type GpsStatus = "locating" | "locked" | "unavailable";

interface LocationState {
  lat: number | null;
  lng: number | null;
  accuracyM: number | null;
  source: "gps" | "manual_pin";
  label: string;
}

// Category Chips Definition
export const CATEGORY_CHIPS = [
  { id: "Road / pothole", label: "Road / pothole", icon: "🚧", enumKey: "infrastructure" },
  { id: "Water / drainage", label: "Water / drainage", icon: "💧", enumKey: "infrastructure" },
  { id: "Garbage / sanitation", label: "Garbage / sanitation", icon: "🗑️", enumKey: "environmental" },
  { id: "Streetlight / electricity", label: "Streetlight / electricity", icon: "💡", enumKey: "infrastructure" },
  { id: "Safety / suspicious activity", label: "Safety / suspicious activity", icon: "⚠️", enumKey: "safety_concern" },
  { id: "Accident", label: "Accident", icon: "🚗", enumKey: "accident" },
  { id: "Environment / pollution", label: "Environment / pollution", icon: "🌳", enumKey: "environmental" },
  { id: "Fire", label: "Fire", icon: "🔥", enumKey: "safety_concern" },
  { id: "Other", label: "Other", icon: "📋", enumKey: "other" },
] as const;

const DRAFT_STORAGE_KEY = "civitas_lens_report_form_draft_v2";

export default function ReportPage() {
  const router = useRouter();

  // Step state (1, 2, or 3)
  const [currentStep, setCurrentStep] = useState<FlowStep>(1);

  // Camera state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>("idle");

  // GPS state
  const gpsWatcherRef = useRef<number | null>(null);
  const [gpsStatus, setGpsStatus] = useState<GpsStatus>("locating");
  const [gpsErrorMsg, setGpsErrorMsg] = useState<string | null>(null);

  // Observation Captured Data
  const [location, setLocation] = useState<LocationState>({
    lat: null,
    lng: null,
    accuracyM: null,
    source: "gps",
    label: "",
  });

  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [capturedPreviewUrl, setCapturedPreviewUrl] = useState<string | null>(null);
  const [capturedAt, setCapturedAt] = useState<Date | null>(null);
  const [captureSource, setCaptureSource] = useState<"live_camera" | "gallery_upload">("live_camera");

  // Step 1 Flow Mode: 'options' (select geotag upload vs camera) or 'camera' (live viewfinder)
  const [step1Mode, setStep1Mode] = useState<"options" | "camera">("options");
  const [isExtractingGeotag, setIsExtractingGeotag] = useState(false);
  const [geotagExtracted, setGeotagExtracted] = useState(false);
  const [geotagAlert, setGeotagAlert] = useState<{ type: "success" | "warning"; message: string } | null>(null);
  const geotagFileInputRef = useRef<HTMLInputElement | null>(null);

  // Step 2: Details Fields
  const [userCategory, setUserCategory] = useState<string>("");
  const [descriptionText, setDescriptionText] = useState<string>("");
  const [reporterName, setReporterName] = useState<string>("");
  const [reporterContact, setReporterContact] = useState<string>("");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showManualPinPicker, setShowManualPinPicker] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);

  // Validation dirty state for Step 2
  const [hasAttemptedStep2, setHasAttemptedStep2] = useState(false);

  // ---------------------------------------------------------------------------
  // Load Draft from SessionStorage on Mount
  // ---------------------------------------------------------------------------
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_STORAGE_KEY);
      if (raw) {
        const draft = JSON.parse(raw);
        if (draft.userCategory) setUserCategory(draft.userCategory);
        if (draft.descriptionText) setDescriptionText(draft.descriptionText);
        if (draft.reporterName) setReporterName(draft.reporterName);
        if (draft.reporterContact) setReporterContact(draft.reporterContact);
        if (draft.lat && draft.lng) {
          setLocation((prev) => ({
            ...prev,
            lat: draft.lat,
            lng: draft.lng,
            accuracyM: draft.accuracyM ?? null,
            source: draft.source ?? "manual_pin",
            label: draft.label ?? "",
          }));
        }
      }
    } catch (e) {
      console.warn("Failed to read draft from sessionStorage:", e);
    }

    // Check auth status
    const supabase = getBrowserSupabase();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
    });
  }, []);

  // ---------------------------------------------------------------------------
  // Save Text Fields Draft to SessionStorage (never the image blob)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    try {
      const draft = {
        userCategory,
        descriptionText,
        reporterName,
        reporterContact,
        lat: location.lat,
        lng: location.lng,
        accuracyM: location.accuracyM,
        source: location.source,
        label: location.label,
      };
      sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
    } catch (e) {
      console.warn("Failed to save draft to sessionStorage:", e);
    }
  }, [userCategory, descriptionText, reporterName, reporterContact, location]);

  // ---------------------------------------------------------------------------
  // Clean Stop Camera & GPS Watcher
  // ---------------------------------------------------------------------------
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const stopGpsWatcher = useCallback(() => {
    if (gpsWatcherRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(gpsWatcherRef.current);
      gpsWatcherRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
      stopGpsWatcher();
    };
  }, [stopCamera, stopGpsWatcher]);

  // ---------------------------------------------------------------------------
  // GPS Acquisition
  // ---------------------------------------------------------------------------
  const startGeolocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsStatus("unavailable");
      setGpsErrorMsg("Geolocation is not supported by your browser.");
      return;
    }

    setGpsStatus("locating");
    setGpsErrorMsg(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setLocation((prev) => ({
          ...prev,
          lat: latitude,
          lng: longitude,
          accuracyM: accuracy,
          source: prev.source === "manual_pin" ? "manual_pin" : "gps",
        }));
        setGpsStatus("locked");
      },
      (err) => {
        console.warn("Initial GPS lock failed:", err.message);
        setGpsStatus("unavailable");
        setGpsErrorMsg("Location unavailable. You can adjust the location on the map.");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );

    stopGpsWatcher();
    gpsWatcherRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setLocation((prev) => {
          if (prev.source === "manual_pin") return prev;
          return {
            ...prev,
            lat: latitude,
            lng: longitude,
            accuracyM: accuracy,
            source: "gps",
          };
        });
        setGpsStatus("locked");
      },
      (err) => {
        console.warn("GPS watch update:", err.message);
      },
      { enableHighAccuracy: true, maximumAge: 5000 },
    );
  }, [stopGpsWatcher]);

  // ---------------------------------------------------------------------------
  // Camera Initialization
  // ---------------------------------------------------------------------------
  const initCamera = useCallback(async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraStatus("unsupported");
      return;
    }

    setCameraStatus("requesting");
    stopCamera();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        await videoRef.current.play();
        setCameraStatus("active");
      }
    } catch (err: any) {
      console.warn("Camera access denied or error:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setCameraStatus("denied");
      } else {
        setCameraStatus("unsupported");
      }
    }
  }, [stopCamera]);

  useEffect(() => {
    if (currentStep === 1 && !capturedBlob && step1Mode === "camera") {
      initCamera();
      startGeolocation();
    }
  }, [currentStep, capturedBlob, step1Mode, initCamera, startGeolocation]);

  const handleStartCamera = () => {
    setShowManualPinPicker(false);
    setStep1Mode("camera");
    setGeotagExtracted(false);
    setGeotagAlert(null);
    initCamera();
    startGeolocation();
  };

  const handleCancelCamera = () => {
    setShowManualPinPicker(false);
    stopCamera();
    stopGpsWatcher();
    setStep1Mode("options");
  };

  // ---------------------------------------------------------------------------
  // Reverse Geocoding
  // ---------------------------------------------------------------------------
  const triggerGeocode = useCallback(async (lat: number, lng: number) => {
    setIsGeocoding(true);
    try {
      const res = await fetch(`/api/geocode?lat=${lat}&lng=${lng}`);
      if (res.ok) {
        const data = await res.json();
        if (data.label) {
          setLocation((prev) => ({
            ...prev,
            label: data.label,
          }));
        }
      }
    } catch (err) {
      console.warn("Geocode fetch error:", err);
    } finally {
      setIsGeocoding(false);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Shutter Press (Live Capture)
  // ---------------------------------------------------------------------------
  const handleShutterPress = () => {
    if (!videoRef.current || cameraStatus !== "active") return;

    const video = videoRef.current;
    const vWidth = video.videoWidth || 1280;
    const vHeight = video.videoHeight || 720;

    const MAX_DIM = 1280;
    let targetWidth = vWidth;
    let targetHeight = vHeight;

    if (vWidth > vHeight && vWidth > MAX_DIM) {
      targetWidth = MAX_DIM;
      targetHeight = Math.round((vHeight * MAX_DIM) / vWidth);
    } else if (vHeight > MAX_DIM) {
      targetHeight = MAX_DIM;
      targetWidth = Math.round((vWidth * MAX_DIM) / vHeight);
    }

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, targetWidth, targetHeight);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;

        stopCamera();
        stopGpsWatcher();

        const previewUrl = URL.createObjectURL(blob);
        setCapturedBlob(blob);
        setCapturedPreviewUrl(previewUrl);
        setCapturedAt(new Date());
        setCaptureSource("live_camera");
        setGeotagExtracted(false);

        if (location.lat !== null && location.lng !== null) {
          triggerGeocode(location.lat, location.lng);
        }
      },
      "image/jpeg",
      0.85,
    );
  };

  // ---------------------------------------------------------------------------
  // Option 1: Geotag Image Upload
  // (Extracts location with Gemma 4 model from geotagged photo; shows error if not geotagged)
  // ---------------------------------------------------------------------------
  const handleGeotagUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so selecting the same file again triggers onChange
    e.target.value = "";

    // Critical: Do NOT fetch device location!
    stopCamera();
    stopGpsWatcher();
    setShowManualPinPicker(false); // Explicitly ensure location popup is never shown

    setIsExtractingGeotag(true);
    setGeotagAlert(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/extract-geotag", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (res.ok && data.success && typeof data.latitude === "number" && typeof data.longitude === "number") {
        const extractedLat = data.latitude;
        const extractedLng = data.longitude;

        setLocation({
          lat: extractedLat,
          lng: extractedLng,
          accuracyM: null,
          source: "gps",
          label: data.location_name || "",
        });
        setGpsStatus("locked");
        setGeotagExtracted(true);
        setGeotagAlert({
          type: "success",
          message: `Location successfully extracted from geotagged photo: ${extractedLat.toFixed(5)}, ${extractedLng.toFixed(5)}`,
        });

        const previewUrl = URL.createObjectURL(file);
        setCapturedBlob(file);
        setCapturedPreviewUrl(previewUrl);
        setCapturedAt(new Date());
        setCaptureSource("gallery_upload");

        triggerGeocode(extractedLat, extractedLng);
      } else {
        // Image is NOT geotagged -> Show clear error and do NOT proceed or open any popup
        setGeotagExtracted(false);
        setCapturedBlob(null);
        setCapturedPreviewUrl(null);
        setGeotagAlert({
          type: "warning",
          message:
            data.error ||
            "This photo does not contain geotag location metadata. Please upload a geotagged photo or use the Take Picture option.",
        });
      }
    } catch (err) {
      console.warn("Geotag extraction request error:", err);
      setGeotagExtracted(false);
      setCapturedBlob(null);
      setCapturedPreviewUrl(null);
      setGeotagAlert({
        type: "warning",
        message:
          "Unable to extract GPS location from this photo. Please ensure it is a valid geotagged photo or take a picture with your camera.",
      });
    } finally {
      setIsExtractingGeotag(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Retake / Change Photo
  // ---------------------------------------------------------------------------
  const handleRetake = () => {
    setShowManualPinPicker(false);
    if (capturedPreviewUrl) {
      URL.revokeObjectURL(capturedPreviewUrl);
    }
    setCapturedBlob(null);
    setCapturedPreviewUrl(null);
    setCapturedAt(null);
    setGeotagExtracted(false);
    setGeotagAlert(null);
    stopCamera();
    stopGpsWatcher();
    setStep1Mode("options");
  };

  // ---------------------------------------------------------------------------
  // Manual Location Adjustment
  // ---------------------------------------------------------------------------
  const handleManualLocationChange = (newLat: number, newLng: number) => {
    setLocation((prev) => ({
      ...prev,
      lat: newLat,
      lng: newLng,
      source: "manual_pin",
      accuracyM: null,
    }));
    triggerGeocode(newLat, newLng);
  };

  // ---------------------------------------------------------------------------
  // Step 2 Validation Helpers
  // ---------------------------------------------------------------------------
  const isDescriptionValid =
    descriptionText.trim().length >= 10 && descriptionText.trim().length <= 1000;
  const isCategoryValid = userCategory.trim().length > 0;
  const isStep2Valid = isCategoryValid && isDescriptionValid;

  // ---------------------------------------------------------------------------
  // Submit Full Observation
  // ---------------------------------------------------------------------------
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSubmitError(null);

    if (location.lat === null || location.lng === null) {
      setSubmitError("Please confirm or drop a location pin on the map.");
      setCurrentStep(1);
      return;
    }

    if (!isStep2Valid) {
      setSubmitError("Please complete the required category and description in Step 2.");
      setCurrentStep(2);
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("text", descriptionText.trim());
      formData.append("user_category", userCategory);

      if (reporterName.trim()) {
        formData.append("reporter_name", reporterName.trim());
      }
      if (reporterContact.trim()) {
        formData.append("reporter_contact", reporterContact.trim());
      }

      formData.append("lat", String(location.lat));
      formData.append("lng", String(location.lng));

      if (location.accuracyM !== null) {
        formData.append("location_accuracy_m", String(location.accuracyM));
      }

      formData.append("capture_source", captureSource);
      formData.append("location_source", location.source);

      if (capturedAt) {
        formData.append("captured_at", capturedAt.toISOString());
      }

      if (location.label.trim()) {
        formData.append("location_label", location.label.trim());
      }

      if (capturedBlob) {
        formData.append("image", capturedBlob, "evidence.jpg");
      }

      const res = await fetch("/api/observations", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorJson = await res.json();
        throw new Error(errorJson.error || "Submission failed. Please check your connection.");
      }

      const data = await res.json();

      // Clear draft on success
      try {
        sessionStorage.removeItem(DRAFT_STORAGE_KEY);
      } catch (err) {
        // ignore
      }

      // Navigate to confirmation page with reference code
      const refQuery = data.reference_code ? `?ref=${encodeURIComponent(data.reference_code)}` : "";
      router.push(`/report/submitted/${data.id}${refQuery}`);
    } catch (err: any) {
      console.error("Submission failed:", err);
      setSubmitError(err.message || "Failed to submit observation. Please try again.");
      setIsSubmitting(false);
    }
  };

  // ===========================================================================
  // PROGRESS INDICATOR HEADER
  // ===========================================================================
  const stepTitles = [
    "Photo and location",
    "Details",
    "Review and submit",
  ];

  const renderProgressHeader = () => (
    <div className="bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-30 shadow-2xs">
      <div className="max-w-7xl mx-auto flex items-center justify-between text-xs sm:text-sm">
        <span className="font-extrabold text-[#0c2340] uppercase tracking-wider flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#f47216]" />
          Step {currentStep} of 3 · {stepTitles[currentStep - 1]}
        </span>
        <div className="flex items-center gap-4">
          {currentStep > 1 && (
            <button
              type="button"
              onClick={() => setCurrentStep((prev) => (prev - 1) as FlowStep)}
              className="text-[#f47216] hover:text-[#ea580c] flex items-center gap-1 font-bold text-xs transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </button>
          )}
          <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-slate-500">
            <span className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden inline-block">
              <span
                className="block h-full bg-[#f47216] rounded-full transition-all duration-300"
                style={{ width: `${(currentStep / 3) * 100}%` }}
              />
            </span>
            <span className="font-mono">{Math.round((currentStep / 3) * 100)}%</span>
          </div>
        </div>
      </div>
    </div>
  );

  // ===========================================================================
  // STEP 1: PHOTO AND LOCATION
  // ===========================================================================
  if (currentStep === 1) {
    const isCameraAvailable = cameraStatus === "active" || cameraStatus === "requesting";

    return (
      <main className="min-h-[calc(100vh-4rem)] flex-1 bg-white font-sans flex flex-col">
        {renderProgressHeader()}

        <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          {/* Hidden File Input for Geotagged Photo */}
          <input
            ref={geotagFileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/*"
            className="sr-only"
            onChange={handleGeotagUpload}
          />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            {/* ================= LEFT COLUMN: HERO HEADLINE & ACTION OPTIONS ================= */}
            <div className="lg:col-span-7 space-y-6">
              <div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#0c2340] leading-tight tracking-tight">
                  Provide Evidence. <br className="hidden sm:block" />
                  <span className="text-[#f47216]">Upload or Click Photo.</span>
                </h1>
                <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed font-medium">
                  Attach visual evidence to help authorities verify and address civic issues. Coordinates are automatically retrieved from geotag or device GPS.
                </p>
              </div>

              {step1Mode === "camera" ? (
                /* Mode: Live Camera Info & Controls */
                <div className="p-6 bg-slate-50 border-2 border-slate-200 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-[#0e88d3] uppercase tracking-wider flex items-center gap-1.5">
                      <Camera className="w-4 h-4" />
                      Live Camera Mode Active
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCancelCamera}
                      className="text-xs border-slate-300 text-[#0c2340] hover:bg-slate-100"
                    >
                      <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                      Return to Options
                    </Button>
                  </div>
                  <p className="text-sm text-slate-600">
                    Align your device towards the incident within the camera viewfinder on the right. Press the shutter button to capture evidence with GPS.
                  </p>
                  <div className="pt-2 flex flex-wrap items-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => geotagFileInputRef.current?.click()}
                      className="text-xs border-slate-300 text-[#0c2340] hover:bg-slate-100"
                    >
                      <Upload className="w-3.5 h-3.5 mr-1.5 text-[#f47216]" />
                      Upload Geotagged Photo Instead
                    </Button>
                  </div>
                </div>
              ) : (
                /* Mode: Options (Upload Geotag vs Take Picture) */
                <div className="space-y-4">
                  {/* Option 1: Upload Geotagged Photo */}
                  <div
                    onClick={() => !isExtractingGeotag && geotagFileInputRef.current?.click()}
                    className="p-6 rounded-2xl bg-white border-2 border-[#f47216] hover:border-[#ea580c] shadow-sm hover:shadow-md transition-all cursor-pointer group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-xl bg-[#fff7ed] border border-[#fed7aa] flex items-center justify-center text-[#f47216] group-hover:scale-105 transition-transform shrink-0">
                          <Upload className="w-6 h-6 text-[#f47216]" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-[#f47216] uppercase tracking-wider">
                              Option 1
                            </span>
                            <span className="text-[10px] bg-[#fff7ed] text-[#c2410c] border border-[#fed7aa] font-bold px-2.5 py-0.5 rounded-full">
                              Auto-reads Location
                            </span>
                          </div>
                          <h2 className="text-lg font-bold text-[#0c2340] group-hover:text-[#f47216] transition-colors mt-0.5">
                            Upload Geotagged Image
                          </h2>
                        </div>
                      </div>
                    </div>

                    <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                      Upload a photo taken with GPS enabled. The incident location is extracted directly using the Gemma 4 vision model without requesting device location.
                    </p>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-sm font-bold text-[#f47216]">
                      <span className="flex items-center gap-2 text-xs sm:text-sm">
                        {isExtractingGeotag ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            Extracting location with Gemma 4…
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-[#f47216]" />
                            Takes location from image
                          </>
                        )}
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        disabled={isExtractingGeotag}
                        className="bg-[#f47216] hover:bg-[#ea580c] text-white font-bold text-xs px-4 py-2 rounded-lg pointer-events-none"
                      >
                        Choose file
                        <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Option 2: Take Picture (Live Camera) */}
                  <div
                    onClick={handleStartCamera}
                    className="p-6 rounded-2xl bg-white border-2 border-slate-200 hover:border-[#0e88d3] shadow-sm hover:shadow-md transition-all cursor-pointer group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center text-[#0e88d3] group-hover:scale-105 transition-transform shrink-0">
                          <Camera className="w-6 h-6 text-[#0e88d3]" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-[#0e88d3] uppercase tracking-wider">
                              Option 2
                            </span>
                            <span className="text-[10px] bg-sky-50 text-sky-800 border border-sky-200 font-bold px-2.5 py-0.5 rounded-full">
                              Live Camera
                            </span>
                          </div>
                          <h2 className="text-lg font-bold text-[#0c2340] group-hover:text-[#0e88d3] transition-colors mt-0.5">
                            Take Picture
                          </h2>
                        </div>
                      </div>
                    </div>

                    <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                      Open your device&apos;s camera to capture real-time photo evidence. Incident coordinates are acquired using your device&apos;s GPS.
                    </p>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-sm font-bold text-[#0e88d3]">
                      <span className="flex items-center gap-2 text-xs sm:text-sm">
                        <MapPin className="w-4 h-4 text-[#0e88d3]" />
                        Uses device GPS
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="border-2 border-slate-300 text-[#0c2340] group-hover:border-[#0e88d3] group-hover:text-[#0e88d3] font-bold text-xs px-4 py-2 rounded-lg pointer-events-none"
                      >
                        Open Camera
                        <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Geotag Warning if previous file had no GPS */}
              {geotagAlert && (
                <Alert variant="destructive" className="rounded-xl bg-amber-50 border border-amber-300 text-amber-900 shadow-xs">
                  <AlertTriangle className="w-4 h-4 text-amber-600 mr-2 shrink-0" />
                  <span className="font-medium">{geotagAlert.message}</span>
                </Alert>
              )}

              {/* Trust Badge matching home page screenshot */}
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-500 bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-lg max-w-max">
                <Shield className="w-4 h-4 text-[#f47216]" />
                Your observation matters. Your privacy matters too.
              </div>

              {/* Skip Photo Button */}
              <div>
                <button
                  type="button"
                  onClick={() => {
                    stopCamera();
                    stopGpsWatcher();
                    setCurrentStep(2);
                  }}
                  className="text-sm font-medium text-slate-500 hover:text-[#0c2340] underline cursor-pointer"
                >
                  Skip photo · Continue with text only
                </button>
              </div>
            </div>

            {/* ================= RIGHT COLUMN: VISUAL EVIDENCE / MAP / VIEWFINDER ================= */}
            <div className="lg:col-span-5">
              <div className="relative h-[480px] w-full rounded-2xl shadow-sm border-2 border-slate-200/90 overflow-hidden bg-slate-50 flex flex-col">
                {capturedPreviewUrl ? (
                  /* State A: Photo is Captured / Uploaded */
                  <div className="relative w-full h-full flex flex-col justify-between bg-slate-50">
                    <div className="absolute top-3 left-3 z-20">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold shadow-xs backdrop-blur-md ${
                        geotagExtracted
                          ? "bg-[#fff7ed] text-[#0c2340] border border-[#fed7aa]"
                          : captureSource === "live_camera"
                            ? "bg-sky-50 text-[#0c2340] border border-sky-200"
                            : "bg-white text-slate-800 border border-slate-200"
                      }`}>
                        {geotagExtracted ? (
                          <>
                            <MapPin className="w-3.5 h-3.5 text-[#f47216]" />
                            Geotag Location (Verified)
                          </>
                        ) : captureSource === "live_camera" ? (
                          <>
                            <Camera className="w-3.5 h-3.5 text-[#0e88d3]" />
                            Live Camera (Device GPS)
                          </>
                        ) : (
                          <>
                            <MapPin className="w-3.5 h-3.5 text-amber-600" />
                            Photo Attached
                          </>
                        )}
                      </span>
                    </div>

                    <div className="absolute top-3 right-3 z-20">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleRetake}
                        className="bg-white/95 border-slate-200 text-[#0c2340] hover:bg-slate-50 text-xs min-h-[34px] rounded-xl shadow-xs font-semibold"
                      >
                        <RefreshCw className="w-3.5 h-3.5 mr-1.5 text-[#f47216]" />
                        Change photo
                      </Button>
                    </div>

                    {/* Captured Image */}
                    <div className="w-full flex-1 flex items-center justify-center p-4 overflow-hidden">
                      <img
                        src={capturedPreviewUrl}
                        alt="Captured observation evidence"
                        className="max-h-full max-w-full object-contain rounded-xl border border-slate-200 shadow-sm bg-white"
                      />
                    </div>

                    {/* Bottom Confirm Action */}
                    <div className="p-4 bg-white border-t border-slate-200 space-y-3">
                      <div className="flex items-center justify-between text-xs text-slate-600">
                        <span className="flex items-center gap-1.5 font-medium truncate">
                          <MapPin className="w-3.5 h-3.5 text-[#f47216] shrink-0" />
                          <span className="truncate">{location.label || "Location confirmed"}</span>
                        </span>
                        <span className="font-mono text-[11px] text-slate-500 shrink-0">
                          {location.lat !== null && location.lng !== null
                            ? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`
                            : ""}
                        </span>
                      </div>
                      <Button
                        type="button"
                        onClick={() => {
                          stopCamera();
                          stopGpsWatcher();
                          setCurrentStep(2);
                        }}
                        className="w-full py-4 text-base font-bold bg-[#f47216] hover:bg-[#ea580c] text-white rounded-xl shadow-sm"
                      >
                        Continue to Details
                        <ArrowRight className="w-5 h-5 ml-2" />
                      </Button>
                    </div>
                  </div>
                ) : step1Mode === "camera" ? (
                  /* State B: Live Camera Viewfinder */
                  isCameraAvailable ? (
                    <div className="relative w-full h-full flex flex-col justify-between bg-slate-900">
                      <div className="relative flex-1 flex items-center justify-center overflow-hidden">
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          className="w-full h-full object-cover"
                        />
                        {/* Aiming Reticle */}
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                          <div className="w-48 h-48 border border-white/30 rounded-lg relative">
                            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#f47216]" />
                            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#f47216]" />
                            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[#f47216]" />
                            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#f47216]" />
                          </div>
                        </div>

                        {/* Top-left Return Button */}
                        <div className="absolute top-3 left-3 z-20">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleCancelCamera}
                            className="bg-[#0c2340]/90 backdrop-blur-md border-white/20 text-white hover:bg-[#0c2340] text-xs min-h-[32px] rounded-lg font-semibold shadow-xs"
                          >
                            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                            Options
                          </Button>
                        </div>
                      </div>

                      {/* Camera Bottom Shutter Bar */}
                      <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between gap-4">
                        <button
                          type="button"
                          onClick={() => geotagFileInputRef.current?.click()}
                          className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-[#0c2340] flex items-center justify-center cursor-pointer transition-colors shadow-xs"
                          title="Upload geotagged photo instead"
                          aria-label="Upload geotagged photo instead"
                        >
                          <Upload className="w-5 h-5 text-[#0c2340]" />
                        </button>

                        <button
                          type="button"
                          onClick={handleShutterPress}
                          disabled={cameraStatus !== "active"}
                          aria-label="Take incident photo"
                          className="w-16 h-16 rounded-full border-4 border-[#0c2340] bg-slate-100 p-1 active:scale-95 hover:bg-slate-200 focus:outline-none focus:ring-4 focus:ring-[#f47216]/50 transition-all flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed mx-auto shadow-sm"
                        >
                          <div className="w-12 h-12 rounded-full bg-[#f47216] border-2 border-white flex items-center justify-center">
                            <div className="w-4 h-4 rounded-full bg-white" />
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            stopCamera();
                            stopGpsWatcher();
                            setCurrentStep(2);
                          }}
                          className="min-h-[44px] px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                          title="Skip photo"
                        >
                          Skip
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Fallback when camera denied */
                    <div className="p-6 text-center space-y-4 my-auto">
                      <div className="w-14 h-14 mx-auto rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                        <Camera className="w-7 h-7" />
                      </div>
                      <h2 className="text-base font-extrabold text-[#0c2340]">Camera Access Not Available</h2>
                      <p className="text-xs text-slate-600">
                        Camera access was denied or is unsupported. You can upload a geotagged photo or continue with text.
                      </p>
                      <Button
                        type="button"
                        onClick={() => {
                          stopCamera();
                          setStep1Mode("options");
                          geotagFileInputRef.current?.click();
                        }}
                        className="bg-[#f47216] hover:bg-[#ea580c] text-white font-bold text-xs"
                      >
                        <Upload className="w-4 h-4 mr-1.5" />
                        Upload Geotagged Image
                      </Button>
                    </div>
                  )
                ) : (
                  /* State C: Map & Location Card (Matches HeroMap in Home Screenshot) */
                  <div className="relative w-full h-full flex flex-col justify-between">
                    {/* Top Status Badges */}
                    <div className="absolute top-3 inset-x-3 z-10 flex items-center justify-between gap-2">
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/95 backdrop-blur-md border border-slate-200/90 text-xs font-semibold text-slate-700 shadow-xs">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            geotagExtracted
                              ? "bg-[#f47216]"
                              : gpsStatus === "locked"
                                ? "bg-emerald-500 animate-pulse"
                                : gpsStatus === "locating"
                                  ? "bg-amber-500 animate-ping"
                                  : "bg-rose-500"
                          }`}
                        />
                        <span>
                          {geotagExtracted
                            ? "Geotag GPS locked"
                            : gpsStatus === "locked"
                              ? `GPS ±${Math.round(location.accuracyM || 0)}m`
                              : gpsStatus === "locating"
                                ? "Acquiring GPS…"
                                : "No GPS lock"}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowManualPinPicker(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/95 backdrop-blur-md border border-slate-200/90 text-xs font-bold text-[#0c2340] hover:text-[#f47216] shadow-xs transition-colors cursor-pointer"
                      >
                        <MapPin className="w-3.5 h-3.5 text-[#f47216]" />
                        Adjust pin
                      </button>
                    </div>

                    {/* Interactive Leaflet Map Thumbnail */}
                    <div className="w-full flex-1">
                      <LocationPicker
                        lat={location.lat ?? 21.1458}
                        lng={location.lng ?? 79.0882}
                        onLocationChange={handleManualLocationChange}
                        onRetryGps={startGeolocation}
                        isLocating={gpsStatus === "locating"}
                        accuracyM={location.accuracyM}
                      />
                    </div>

                    {/* Bottom Locality Badge */}
                    <div className="p-3.5 bg-white border-t border-slate-200 flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-slate-700 font-semibold truncate">
                        <MapPin className="w-3.5 h-3.5 text-[#f47216] shrink-0" />
                        <span className="truncate">{location.label || (isGeocoding ? "Resolving address…" : "Location locked")}</span>
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono font-semibold shrink-0">
                        {location.lat !== null && location.lng !== null
                          ? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`
                          : "No GPS"}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Location Manual Picker Modal (Overlay) */}
          {showManualPinPicker && (
            <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl border border-slate-200 max-w-2xl w-full h-[520px] flex flex-col overflow-hidden shadow-2xl">
                <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="text-base font-extrabold text-[#0c2340] flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-[#f47216]" />
                    Set Incident Location Pin
                  </h3>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowManualPinPicker(false)}
                    className="border-slate-300 font-semibold text-xs"
                  >
                    Done
                  </Button>
                </div>
                <div className="flex-1">
                  <LocationPicker
                    lat={location.lat ?? 21.1458}
                    lng={location.lng ?? 79.0882}
                    onLocationChange={handleManualLocationChange}
                    onRetryGps={startGeolocation}
                    isLocating={gpsStatus === "locating"}
                    accuracyM={location.accuracyM}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    );
  }

  // ===========================================================================
  // STEP 2: DETAILS (WHAT, DESCRIPTION, URGENCY, OPTIONAL CONTACT)
  // ===========================================================================
  if (currentStep === 2) {
    return (
      <main className="min-h-[calc(100vh-4rem)] flex-1 bg-slate-50/80 text-slate-900 flex flex-col">
        {renderProgressHeader()}

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-4 py-5 space-y-5 pb-24">
            {/* Section A: What is the problem? */}
            <section className="bg-white rounded-2xl border border-slate-200/90 p-5 space-y-3 shadow-sm">
              <div>
                <label className="block text-sm font-extrabold text-[#0c2340]">
                  What is the problem? <span className="text-rose-600">*</span>
                </label>
                <p className="text-xs text-slate-500 mt-0.5">
                  Choose the category that best describes the issue.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                {CATEGORY_CHIPS.map((chip) => {
                  const isSelected = userCategory === chip.id;
                  return (
                    <button
                      key={chip.id}
                      type="button"
                      onClick={() => setUserCategory(chip.id)}
                      className={`min-h-[48px] px-3 py-2.5 rounded-xl border text-left text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${isSelected
                          ? "bg-[#fff7ed] text-[#0c2340] border-[#f47216] shadow-xs ring-2 ring-[#f47216]/30 font-bold"
                          : "bg-white text-slate-700 border-slate-200/90 hover:bg-slate-50 hover:border-slate-300"
                        }`}
                    >
                      <span className="text-base shrink-0">{chip.icon}</span>
                      <span className="truncate">{chip.label}</span>
                    </button>
                  );
                })}
              </div>

              {hasAttemptedStep2 && !isCategoryValid && (
                <p className="text-xs text-rose-600 font-medium">
                  Please select a category for the problem.
                </p>
              )}
            </section>

            {/* Section B: Describe the issue */}
            <section className="bg-white rounded-2xl border border-slate-200/90 p-5 space-y-2.5 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <label htmlFor="description" className="block text-sm font-extrabold text-[#0c2340]">
                    Describe the issue <span className="text-rose-600">*</span>
                  </label>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Tell us what you saw, when it started, and anything that makes it urgent.
                  </p>
                </div>
                <span
                  className={`text-[11px] font-mono shrink-0 px-2 py-0.5 rounded-md ${descriptionText.length < 10
                      ? "text-amber-700 bg-amber-50"
                      : descriptionText.length > 1000
                        ? "text-rose-700 bg-rose-50 font-bold"
                        : "text-slate-600 bg-slate-100"
                    }`}
                >
                  {descriptionText.length} / 1000
                </span>
              </div>

              <Textarea
                id="description"
                value={descriptionText}
                onChange={(e) => setDescriptionText(e.target.value)}
                maxLength={1000}
                rows={4}
                placeholder="E.g. Broken water pipe gushing across the road divider near the signal. Water has flooded two lanes and vehicles are skidding."
                className="text-xs resize-none rounded-xl border-slate-200 focus:border-[#f47216] focus:ring-[#f47216]/20"
              />

              {hasAttemptedStep2 && !isDescriptionValid && (
                <p className="text-xs text-rose-600 font-medium">
                  {descriptionText.trim().length === 0
                    ? "Description is required (minimum 10 characters)."
                    : descriptionText.trim().length < 10
                      ? `Please enter at least ${10 - descriptionText.trim().length} more characters.`
                      : "Description exceeds 1000 characters."}
                </p>
              )}
            </section>

    {/* Section D: Optional Contact Information */ }
    {
      !isAuthenticated && (
        <section className="bg-white rounded-2xl border border-slate-200/90 p-5 space-y-3 shadow-xs">
          <div>
            <h3 className="text-sm font-extrabold text-[#0c2340] flex items-center gap-1.5">
              <User className="w-4 h-4 text-[#f47216]" />
              Your contact details <span className="text-xs text-slate-400 font-normal">(optional)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Optional. Shared only with authorized municipal response staff if clarification is needed.
            </p>
          </div>

          <div className="space-y-3 pt-1">
            <div>
              <label htmlFor="reporter_name" className="block text-xs font-semibold text-slate-700">
                Your name
              </label>
              <Input
                id="reporter_name"
                value={reporterName}
                onChange={(e) => setReporterName(e.target.value)}
                placeholder="e.g. Rahul Verma"
                className="text-xs h-10 mt-1 rounded-xl border-slate-200 focus:border-[#f47216] focus:ring-[#f47216]/20"
              />
            </div>

            <div>
              <label htmlFor="reporter_contact" className="block text-xs font-semibold text-slate-700">
                Phone number
              </label>
              <Input
                id="reporter_contact"
                value={reporterContact}
                onChange={(e) => setReporterContact(e.target.value)}
                placeholder="e.g. +91 98765 43210"
                className="text-xs h-10 mt-1 rounded-xl border-slate-200 focus:border-[#f47216] focus:ring-[#f47216]/20"
              />
            </div>
                </div>
            </section>
          )}

            {/* Inline Error Message */}
            {hasAttemptedStep2 && !isStep2Valid && (
              <Alert variant="destructive" className="text-xs rounded-xl">
                Please choose a problem category and provide at least 10 characters of description to continue.
              </Alert>
            )}

            {/* Step 2 Action Buttons */}
            <div className="pt-2 flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentStep(1)}
                className="flex-1 min-h-[46px] rounded-xl border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold text-xs"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>

              <Button
                type="button"
                variant="teal"
                onClick={() => {
                  setHasAttemptedStep2(true);
                  if (isStep2Valid) {
                    setCurrentStep(3);
                  }
                }}
                disabled={!isStep2Valid}
                className="flex-1 min-h-[46px] text-white font-bold text-xs disabled:opacity-50"
              >
                Continue to Review
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </main >
    );
    }

    // ===========================================================================
    // STEP 3: REVIEW AND SUBMIT
    // ===========================================================================
    return (
      <main className="min-h-[calc(100vh-4rem)] flex-1 bg-slate-50/80 text-slate-900 flex flex-col">
        {renderProgressHeader()}

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-4 py-5 space-y-5 pb-24">
            <div className="space-y-1">
              <h1 className="text-lg font-extrabold text-[#0c2340]">Review Your Report</h1>
              <p className="text-xs text-slate-500">
                Check the details below before submitting to the Civitas Lens intelligence center.
              </p>
            </div>

            {/* Review Card 1: Photo & Evidence */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 space-y-3 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <h2 className="text-xs font-bold text-[#0c2340] uppercase tracking-wide flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-[#f47216]" />
                  Photographic Evidence
                </h2>
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="text-xs text-[#f47216] font-bold hover:text-[#ea580c] flex items-center gap-1 transition-colors"
                >
                  <Edit2 className="w-3 h-3" />
                  Edit
                </button>
              </div>

              {capturedPreviewUrl ? (
                <div className="space-y-2">
                  <div className="rounded-xl border border-slate-200 overflow-hidden bg-black max-h-72 flex items-center justify-center">
                    <img
                      src={capturedPreviewUrl}
                      alt="Captured observation evidence"
                      className="w-full h-auto max-h-72 object-contain"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                    {geotagExtracted ? (
                      <span className="inline-flex items-center gap-1 text-[#ea580c] font-semibold bg-[#fff7ed] px-2.5 py-0.5 rounded-full border border-[#f47216]/25">
                        <MapPin className="w-3 h-3 text-[#f47216]" />
                        Location extracted directly from photo geotag (EXIF)
                      </span>
                    ) : captureSource === "live_camera" ? (
                      <span className="inline-flex items-center gap-1 text-[#0c2340] font-semibold bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                        <Camera className="w-3 h-3 text-[#f47216]" />
                        Captured with live camera & device GPS
                      </span>
                    ) : null}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic py-1">
                  No photo attached (text-only observation).
                </p>
              )}
            </div>

            {/* Review Card 2: Incident Location */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 space-y-3 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <h2 className="text-xs font-bold text-[#0c2340] uppercase tracking-wide flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#f47216]" />
                  Location
                </h2>
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="text-xs text-[#f47216] font-bold hover:text-[#ea580c] flex items-center gap-1 transition-colors"
                >
                  <Edit2 className="w-3 h-3" />
                  Edit
                </button>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-bold text-[#0c2340]">
                  {location.label || "Pinned Location"}
                </p>
                <p className="text-[11px] text-slate-500 font-mono">
                  {location.lat !== null && location.lng !== null
                    ? `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`
                    : "No coordinates"}
                  {location.accuracyM !== null && ` · GPS ±${Math.round(location.accuracyM)}m`}
                </p>

                {location.lat !== null && location.lng !== null && (
                  <MapThumbnail
                    lat={location.lat}
                    lng={location.lng}
                    accuracyM={location.accuracyM}
                    className="h-28 w-full rounded-xl border border-slate-200 overflow-hidden"
                  />
                )}
              </div>
            </div>

            {/* Review Card 3: Report Details */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 space-y-3 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <h2 className="text-xs font-bold text-[#0c2340] uppercase tracking-wide flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#f47216]" />
                  Report Details
                </h2>
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="text-xs text-[#f47216] font-bold hover:text-[#ea580c] flex items-center gap-1 transition-colors"
                >
                  <Edit2 className="w-3 h-3" />
                  Edit
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-[11px] text-slate-500 block">Category</span>
                  <span className="font-extrabold text-[#0c2340] text-sm">{userCategory || "Not selected"}</span>
                </div>

                <div>
                  <span className="text-[11px] text-slate-500 block mb-1">Description</span>
                  <p className="p-3 rounded-xl bg-slate-50 border border-slate-200/90 text-slate-800 whitespace-pre-wrap leading-relaxed">
                    {descriptionText}
                  </p>
                </div>

                {/* Reporter Contact Details */}
                <div className="border-t border-slate-100 pt-3 space-y-2">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Citizen Contact Information
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-[#fff7ed] border border-[#f47216]/20 flex items-center justify-center shrink-0">
                        <User className="w-3.5 h-3.5 text-[#f47216]" />
                      </div>
                      <div className="truncate">
                        <span className="text-[10px] text-slate-400 block font-medium">Reporter Name</span>
                        <span className="font-bold text-[#0c2340] text-xs truncate block">
                          {reporterName.trim() ? reporterName.trim() : "Not provided (Anonymous)"}
                        </span>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-[#fff7ed] border border-[#f47216]/20 flex items-center justify-center shrink-0">
                        <Phone className="w-3.5 h-3.5 text-[#f47216]" />
                      </div>
                      <div className="truncate">
                        <span className="text-[10px] text-slate-400 block font-medium">Contact Number</span>
                        <span className="font-bold text-[#0c2340] text-xs truncate block">
                          {reporterContact.trim() ? reporterContact.trim() : "Not provided"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Privacy Note */}
            <div className="bg-[#fff7ed] rounded-2xl border border-[#f47216]/20 p-3.5 flex items-start gap-3 text-xs text-[#0c2340]">
              <Shield className="w-4 h-4 text-[#f47216] shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                Your observation evidence is analyzed by Civitas Lens to correlate public incidents and dispatch municipal responders. Contact details are never displayed publicly.
              </p>
            </div>

            {/* Submit Error Banner if Any */}
            {submitError && (
              <Alert variant="destructive" className="text-xs rounded-xl">
                {submitError}
              </Alert>
            )}

            {/* Submit & Edit Buttons */}
            <div className="space-y-2.5 pt-2">
              <Button
                type="button"
                variant="teal"
                onClick={handleSubmit}
                disabled={isSubmitting || location.lat === null || location.lng === null || !isStep2Valid}
                className="w-full min-h-[48px] text-sm font-bold text-white rounded-xl"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Submitting report…
                  </>
                ) : (
                  "Submit report"
                )}
              </Button>

              <Button
                type="button"
                variant="ghost"
                onClick={() => setCurrentStep(2)}
                disabled={isSubmitting}
                className="w-full text-xs text-slate-600 hover:text-[#0c2340]"
              >
                Back to edit details
              </Button>
            </div>
          </div>
        </div>
      </main>
    );
  }
