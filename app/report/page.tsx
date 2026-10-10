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

export const URGENCY_CARDS = [
  {
    id: "low",
    title: "Low",
    subtitle: "Not urgent",
    desc: "Minor defect or routine maintenance issue. No risk to safety.",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-300",
  },
  {
    id: "medium",
    title: "Medium",
    subtitle: "Needs attention soon",
    desc: "Noticeable hazard, disruption, or worsening situation.",
    badgeClass: "bg-amber-100 text-amber-900 border-amber-300",
  },
  {
    id: "high",
    title: "High",
    subtitle: "Immediate danger or serious impact",
    desc: "Severe risk to safety, major road blockage, or critical emergency.",
    badgeClass: "bg-rose-100 text-rose-900 border-rose-300",
  },
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

  // Step 2: Details Fields
  const [userCategory, setUserCategory] = useState<string>("");
  const [descriptionText, setDescriptionText] = useState<string>("");
  const [userUrgency, setUserUrgency] = useState<"low" | "medium" | "high">("medium");
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
        if (draft.userUrgency) setUserUrgency(draft.userUrgency);
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
        userUrgency,
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
  }, [userCategory, descriptionText, userUrgency, reporterName, reporterContact, location]);

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
      setShowManualPinPicker(true);
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
        if (accuracy > 150) {
          setShowManualPinPicker(true);
        }
      },
      (err) => {
        console.warn("Initial GPS lock failed:", err.message);
        setGpsStatus("unavailable");
        setGpsErrorMsg("Location unavailable. Please place a pin manually on the map.");
        setShowManualPinPicker(true);
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
    if (currentStep === 1 && !capturedBlob) {
      initCamera();
      startGeolocation();
    }
  }, [currentStep, capturedBlob, initCamera, startGeolocation]);

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

        if (location.lat !== null && location.lng !== null) {
          triggerGeocode(location.lat, location.lng);
        }
      },
      "image/jpeg",
      0.85,
    );
  };

  // ---------------------------------------------------------------------------
  // Gallery Upload Fallback
  // ---------------------------------------------------------------------------
  const handleGalleryUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    stopCamera();
    stopGpsWatcher();

    const previewUrl = URL.createObjectURL(file);
    setCapturedBlob(file);
    setCapturedPreviewUrl(previewUrl);
    setCapturedAt(new Date());
    setCaptureSource("gallery_upload");

    if (location.lat !== null && location.lng !== null) {
      triggerGeocode(location.lat, location.lng);
    } else {
      setShowManualPinPicker(true);
    }
  };

  // ---------------------------------------------------------------------------
  // Retake Photo
  // ---------------------------------------------------------------------------
  const handleRetake = () => {
    if (capturedPreviewUrl) {
      URL.revokeObjectURL(capturedPreviewUrl);
    }
    setCapturedBlob(null);
    setCapturedPreviewUrl(null);
    setCapturedAt(null);
    initCamera();
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
      formData.append("user_urgency", userUrgency);

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
    <div className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 py-3.5 sticky top-0 z-30 shadow-xs">
      <div className="max-w-md mx-auto space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-extrabold text-[#0a2540] uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#00a896]" />
            Step {currentStep} of 3 · {stepTitles[currentStep - 1]}
          </span>
          {currentStep > 1 && (
            <button
              type="button"
              onClick={() => setCurrentStep((prev) => (prev - 1) as FlowStep)}
              className="text-[#028090] hover:text-[#00a896] flex items-center gap-1 font-bold text-xs transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </button>
          )}
        </div>

        {/* 3-Step Progress Bar with connecting teal gradient */}
        <div className="grid grid-cols-3 gap-2 h-2 w-full bg-slate-100 rounded-full overflow-hidden p-0.5">
          <div className={`h-full rounded-full transition-all duration-300 ${currentStep >= 1 ? "bg-teal-gradient shadow-xs" : "bg-slate-200"}`} />
          <div className={`h-full rounded-full transition-all duration-300 ${currentStep >= 2 ? "bg-teal-gradient shadow-xs" : "bg-slate-200"}`} />
          <div className={`h-full rounded-full transition-all duration-300 ${currentStep >= 3 ? "bg-teal-gradient shadow-xs" : "bg-slate-200"}`} />
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
      <main className="h-screen bg-slate-900 text-white flex flex-col overflow-hidden">
        {renderProgressHeader()}

        {/* Sub-header status bar */}
        <div className="p-3 bg-black/60 border-b border-white/10 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                gpsStatus === "locked"
                  ? "bg-emerald-400 animate-pulse"
                  : gpsStatus === "locating"
                  ? "bg-amber-400 animate-ping"
                  : "bg-rose-400"
              }`}
            />
            <span className="text-slate-300">
              {gpsStatus === "locked"
                ? `GPS ±${Math.round(location.accuracyM || 0)}m`
                : gpsStatus === "locating"
                ? "Acquiring GPS…"
                : "GPS unavailable"}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowManualPinPicker(!showManualPinPicker)}
            className="text-xs text-sky-400 hover:text-sky-300 underline font-sans"
          >
            {showManualPinPicker ? "Close map" : "Adjust on map"}
          </button>
        </div>

        {/* Center: Viewfinder OR Captured Preview */}
        <div className="relative flex-1 flex items-center justify-center overflow-hidden bg-black">
          {capturedPreviewUrl ? (
            /* Review captured image */
            <div className="relative w-full h-full flex items-center justify-center">
              <img
                src={capturedPreviewUrl}
                alt="Captured observation evidence"
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 right-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleRetake}
                  className="bg-black/60 border-white/30 text-white hover:bg-black/80 text-xs min-h-[36px]"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                  Retake
                </Button>
              </div>
            </div>
          ) : isCameraAvailable ? (
            /* Live Camera Viewfinder */
            <div className="relative w-full h-full flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-64 h-64 border border-white/20 rounded-lg relative">
                  <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-white/60" />
                  <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-white/60" />
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-white/60" />
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-white/60" />
                </div>
              </div>
            </div>
          ) : (
            /* Fallback when camera permission denied or unavailable */
            <div className="p-6 max-w-md mx-auto text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
                <Camera className="w-7 h-7 text-amber-400" />
              </div>
              <div className="space-y-1">
                <h2 className="text-base font-semibold text-white">Camera Access</h2>
                <p className="text-xs text-slate-300 leading-relaxed">
                  You can snap a photo, upload an image from your device, or report with description only.
                </p>
              </div>

              <div className="pt-2 flex flex-col gap-2.5">
                <label className="inline-flex items-center justify-center min-h-[46px] px-4 py-2.5 bg-teal-gradient text-white font-bold text-xs rounded-xl shadow-teal-glow cursor-pointer hover:opacity-95 transition-all">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload photo from device
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    onChange={handleGalleryUpload}
                  />
                </label>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    stopCamera();
                    stopGpsWatcher();
                    setCurrentStep(2);
                  }}
                  className="min-h-[44px] bg-slate-800 border-slate-700 text-white hover:bg-slate-700 text-xs"
                >
                  Skip photo · Continue with text only
                </Button>
              </div>
            </div>
          )}

          {/* Location manual picker overlay */}
          {showManualPinPicker && (
            <div className="absolute inset-0 z-40 bg-slate-900/95 p-4 flex flex-col overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-700">
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-rose-400" />
                  Set Location Pin
                </h3>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowManualPinPicker(false)}
                  className="bg-white/10 text-white border-white/20 text-xs min-h-[36px]"
                >
                  Done
                </Button>
              </div>
              <div className="flex-1 pt-3">
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
          )}
        </div>

        {/* Bottom Action Bar */}
        <div className="relative z-20 p-4 bg-black/90 border-t border-white/10 flex flex-col items-center gap-3">
          {/* Location badge snippet */}
          <div className="w-full max-w-sm flex items-center justify-between text-xs text-slate-300 px-1 truncate">
            <span className="flex items-center gap-1.5 truncate">
              <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span className="truncate">
                {location.label || (isGeocoding ? "Resolving address…" : "Location locked")}
              </span>
            </span>
            <span className="text-[11px] text-slate-400 shrink-0 font-mono">
              {location.lat !== null && location.lng !== null
                ? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`
                : "No GPS"}
            </span>
          </div>

          <div className="w-full max-w-sm flex items-center justify-between gap-4">
            {/* Gallery Upload */}
            <label
              className="min-h-[44px] min-w-[44px] p-2.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white flex items-center justify-center cursor-pointer transition-colors"
              title="Upload photo"
              aria-label="Upload photo"
            >
              <Upload className="w-5 h-5" />
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={handleGalleryUpload}
              />
            </label>

            {/* Shutter Button (disabled if already captured) */}
            {!capturedPreviewUrl ? (
              <button
                type="button"
                onClick={handleShutterPress}
                disabled={cameraStatus !== "active"}
                aria-label="Take incident photo"
                className="w-18 h-18 rounded-full border-4 border-white/90 bg-white/20 p-1 active:scale-95 hover:bg-white/30 focus:outline-none focus:ring-4 focus:ring-[#00a896]/50 transition-all flex items-center justify-center shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#028090] to-[#0a2540] border-2 border-white flex items-center justify-center shadow-inner">
                  <div className="w-5 h-5 rounded-full bg-white shadow-xs" />
                </div>
              </button>
            ) : (
              <Button
                type="button"
                variant="teal"
                onClick={() => {
                  stopCamera();
                  stopGpsWatcher();
                  setCurrentStep(2);
                }}
                className="flex-1 min-h-[48px] shadow-teal-glow text-white font-bold text-sm"
              >
                Continue to Details
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}

            {/* Skip Photo Button */}
            {!capturedPreviewUrl && (
              <button
                type="button"
                onClick={() => {
                  stopCamera();
                  stopGpsWatcher();
                  setCurrentStep(2);
                }}
                className="min-h-[44px] px-3.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                title="Skip photo"
              >
                Skip photo
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </main>
    );
  }

  // ===========================================================================
  // STEP 2: DETAILS (WHAT, DESCRIPTION, URGENCY, OPTIONAL CONTACT)
  // ===========================================================================
  if (currentStep === 2) {
    return (
      <main className="h-screen bg-slate-50/80 text-slate-900 flex flex-col overflow-hidden">
        {renderProgressHeader()}

        <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-5 space-y-5 pb-24">
          {/* Section A: What is the problem? */}
          <section className="bg-white rounded-2xl border border-slate-200/90 p-5 space-y-3 shadow-sm">
            <div>
              <label className="block text-sm font-extrabold text-[#0a2540]">
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
                    className={`min-h-[48px] px-3 py-2.5 rounded-xl border text-left text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                      isSelected
                        ? "bg-[#f0fdfa] text-[#0a2540] border-[#028090] shadow-xs ring-2 ring-[#00a896]/30 font-bold"
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
                <label htmlFor="description" className="block text-sm font-extrabold text-[#0a2540]">
                  Describe the issue <span className="text-rose-600">*</span>
                </label>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tell us what you saw, when it started, and anything that makes it urgent.
                </p>
              </div>
              <span
                className={`text-[11px] font-mono shrink-0 px-2 py-0.5 rounded-md ${
                  descriptionText.length < 10
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
              className="text-xs resize-none rounded-xl border-slate-200 focus:border-[#028090] focus:ring-[#00a896]/20"
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

          {/* Section C: How urgent is it? */}
          <section className="bg-white rounded-2xl border border-slate-200/90 p-5 space-y-3 shadow-xs">
            <div>
              <label className="block text-sm font-extrabold text-[#0a2540]">
                How urgent is it? <span className="text-rose-600">*</span>
              </label>
              <p className="text-xs text-slate-500 mt-0.5">
                Helps dispatch teams triage immediate public safety threats.
              </p>
            </div>

            <div className="space-y-2.5 pt-1">
              {URGENCY_CARDS.map((card) => {
                const isSelected = userUrgency === card.id;
                return (
                  <label
                    key={card.id}
                    className={`block p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? "border-[#028090] bg-[#f0fdfa] ring-2 ring-[#00a896]/25 shadow-xs"
                        : "border-slate-200/90 bg-white hover:bg-slate-50/80"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="urgency"
                        value={card.id}
                        checked={isSelected}
                        onChange={() => setUserUrgency(card.id as any)}
                        className="mt-1 h-4 w-4 text-[#028090] border-slate-300 focus:ring-[#028090]"
                      />
                      <div className="space-y-0.5 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#0a2540]">{card.title}</span>
                          <span className="text-[11px] text-slate-500">· {card.subtitle}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          {card.desc}
                        </p>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </section>

          {/* Section D: Optional Contact Information */}
          {!isAuthenticated && (
            <section className="bg-white rounded-2xl border border-slate-200/90 p-5 space-y-3 shadow-xs">
              <div>
                <h3 className="text-sm font-extrabold text-[#0a2540] flex items-center gap-1.5">
                  <User className="w-4 h-4 text-[#028090]" />
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
                    className="text-xs h-10 mt-1 rounded-xl border-slate-200 focus:border-[#028090] focus:ring-[#00a896]/20"
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
                    className="text-xs h-10 mt-1 rounded-xl border-slate-200 focus:border-[#028090] focus:ring-[#00a896]/20"
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
              className="flex-1 min-h-[46px] shadow-teal-glow text-white font-bold text-xs disabled:opacity-50"
            >
              Continue to Review
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
        </div>
      </main>
    );
  }

  // ===========================================================================
  // STEP 3: REVIEW AND SUBMIT
  // ===========================================================================
  return (
    <main className="h-screen bg-[#f8fafc] text-slate-900 flex flex-col overflow-hidden">
      {renderProgressHeader()}

      <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto px-4 py-5 space-y-5 pb-24">
        <div className="space-y-1">
          <h1 className="text-lg font-extrabold text-[#0a2540]">Review Your Report</h1>
          <p className="text-xs text-slate-500">
            Check the details below before submitting to the Civitas Lens intelligence center.
          </p>
        </div>

        {/* Review Card 1: Photo & Evidence */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 space-y-3 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <h2 className="text-xs font-bold text-[#0a2540] uppercase tracking-wide flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-[#028090]" />
              Photographic Evidence
            </h2>
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="text-xs text-[#028090] font-bold hover:text-[#00a896] flex items-center gap-1 transition-colors"
            >
              <Edit2 className="w-3 h-3" />
              Edit
            </button>
          </div>

          {capturedPreviewUrl ? (
            <div className="rounded-xl border border-slate-200 overflow-hidden bg-black max-h-72 flex items-center justify-center">
              <img
                src={capturedPreviewUrl}
                alt="Captured observation evidence"
                className="w-full h-auto max-h-72 object-contain"
              />
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
            <h2 className="text-xs font-bold text-[#0a2540] uppercase tracking-wide flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#028090]" />
              Location
            </h2>
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="text-xs text-[#028090] font-bold hover:text-[#00a896] flex items-center gap-1 transition-colors"
            >
              <Edit2 className="w-3 h-3" />
              Edit
            </button>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-bold text-[#0a2540]">
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

        {/* Review Card 3: Problem Details & Urgency */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 space-y-3 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <h2 className="text-xs font-bold text-[#0a2540] uppercase tracking-wide flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#028090]" />
              Details & Urgency
            </h2>
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="text-xs text-[#028090] font-bold hover:text-[#00a896] flex items-center gap-1 transition-colors"
            >
              <Edit2 className="w-3 h-3" />
              Edit
            </button>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center gap-3">
              <div>
                <span className="text-[11px] text-slate-500 block">Category</span>
                <span className="font-extrabold text-[#0a2540]">{userCategory || "Not selected"}</span>
              </div>
              <div className="border-l border-slate-200 pl-3">
                <span className="text-[11px] text-slate-500 block">Urgency</span>
                <span
                  className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase border ${
                    userUrgency === "high"
                      ? "bg-rose-50 text-rose-800 border-rose-300"
                      : userUrgency === "medium"
                      ? "bg-amber-50 text-amber-800 border-amber-300"
                      : "bg-[#f0fdfa] text-[#028090] border-[#00a896]/30"
                  }`}
                >
                  {userUrgency}
                </span>
              </div>
            </div>

            <div>
              <span className="text-[11px] text-slate-500 block mb-1">Description</span>
              <p className="p-3 rounded-xl bg-slate-50 border border-slate-200/90 text-slate-800 whitespace-pre-wrap leading-relaxed">
                {descriptionText}
              </p>
            </div>

            {(reporterName || reporterContact) && (
              <div className="border-t border-slate-100 pt-2.5 text-[11px] text-slate-600">
                <span className="font-bold text-[#0a2540]">Reporter: </span>
                {reporterName || "Anonymous"} {reporterContact ? `(${reporterContact})` : ""}
              </div>
            )}
          </div>
        </div>

        {/* Privacy Note */}
        <div className="bg-[#f0fdfa] rounded-2xl border border-[#028090]/20 p-3.5 flex items-start gap-3 text-xs text-[#0a2540]">
          <Shield className="w-4 h-4 text-[#028090] shrink-0 mt-0.5" />
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
            className="w-full min-h-[48px] text-sm font-bold shadow-teal-glow text-white rounded-xl"
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
            className="w-full text-xs text-slate-600 hover:text-[#0a2540]"
          >
            Back to edit details
          </Button>
        </div>
      </div>
      </div>
    </main>
  );
}
