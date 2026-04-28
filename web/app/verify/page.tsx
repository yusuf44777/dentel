"use client";

import { useCallback, useMemo, useRef, useState } from "react";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";
const EDEVLET_STUDENT_CERTIFICATE_URL =
  "https://www.turkiye.gov.tr/yok-ogrenci-belgesi-sorgulama";

type Phase = "idle" | "uploading" | "processing" | "done" | "error";
type AuthMode = "login" | "register";

interface Student {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  university: string;
  department: string;
  class_level: string;
  tc_masked?: string | null;
  verified_at: string;
}

interface ProgressEvent {
  step: string;
  progress: number;
  message: string;
  tc_masked?: string;
  barcode?: string;
  student?: Student;
  result?: {
    valid: boolean | null;
    valid_label: string;
    details: string;
    error: string | null;
  };
}

interface ExtractedInfo {
  tc_masked?: string;
  barcode?: string;
}

interface RegisterForm {
  fullName: string;
  email: string;
  phone: string;
  university: string;
  department: string;
  classLevel: string;
  password: string;
  confirmPassword: string;
  tcOverride: string;
  barcodeOverride: string;
}

const CLASS_LEVELS = [
  "Hazırlık",
  "1. Sınıf",
  "2. Sınıf",
  "3. Sınıf",
  "4. Sınıf",
  "5. Sınıf",
  "Mezun",
];

const STEPS = [
  { key: "uploaded", label: "PDF" },
  { key: "extracting", label: "Okuma" },
  { key: "tc_found", label: "Kimlik" },
  { key: "barcode_found", label: "Barkod" },
  { key: "connecting", label: "Bağlantı" },
  { key: "entering_code", label: "Kod" },
  { key: "submitting", label: "Sorgu" },
  { key: "reading_result", label: "Sonuç" },
  { key: "complete", label: "Doğrulama" },
  { key: "registered", label: "Kayıt" },
];

const initialRegisterForm: RegisterForm = {
  fullName: "",
  email: "",
  phone: "",
  university: "Üsküdar Üniversitesi",
  department: "Diş Hekimliği",
  classLevel: "",
  password: "",
  confirmPassword: "",
  tcOverride: "",
  barcodeOverride: "",
};

function stepIndex(key: string) {
  const index = STEPS.findIndex((step) => step.key === key);
  return index === -1 ? STEPS.findIndex((step) => step.key === "complete") : index;
}

function formatFileSize(size: number) {
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function parseError(error: unknown) {
  return error instanceof Error ? error.message : "Bilinmeyen hata oluştu.";
}

export default function VerifyPage() {
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [student, setStudent] = useState<Student | null>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [registerForm, setRegisterForm] = useState<RegisterForm>(initialRegisterForm);

  const [phase, setPhase] = useState<Phase>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(-1);
  const [logs, setLogs] = useState<string[]>([]);
  const [extracted, setExtracted] = useState<ExtractedInfo>({});
  const [result, setResult] = useState<ProgressEvent["result"] | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isRunning = phase === "uploading" || phase === "processing";
  const isRegistering = authMode === "register" && isRunning;

  const selectedStepLabel = useMemo(() => {
    if (currentStep < 0) return "Beklemede";
    return STEPS[Math.min(currentStep, STEPS.length - 1)]?.label ?? "İşleniyor";
  }, [currentStep]);

  const updateRegisterField = (key: keyof RegisterForm, value: string) => {
    setRegisterForm((prev) => ({ ...prev, [key]: value }));
  };

  const addLog = (message: string) => {
    setLogs((prev) => [...prev, message]);
  };

  const resetVerification = () => {
    setPhase("idle");
    setFile(null);
    setProgress(0);
    setCurrentStep(-1);
    setLogs([]);
    setExtracted({});
    setResult(null);
    setErrorMsg("");
  };

  const handleFile = (nextFile: File) => {
    if (!nextFile.name.toLowerCase().endsWith(".pdf")) {
      setErrorMsg("Lütfen e-Devlet üzerinden alınan PDF dosyasını seçin.");
      return;
    }
    if (nextFile.size > 20 * 1024 * 1024) {
      setErrorMsg("PDF 20 MB'dan büyük olamaz.");
      return;
    }
    setFile(nextFile);
    setErrorMsg("");
  };

  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);
    const droppedFile = event.dataTransfer.files[0];
    if (droppedFile) handleFile(droppedFile);
  }, []);

  const onDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(true);
  };

  const consumeProgressStream = async (response: Response) => {
    if (!response.body) throw new Error("Sunucu yanıtı okunamadı.");

    setPhase("processing");
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const chunks = buffer.split("\n\n");
      buffer = chunks.pop() ?? "";

      for (const chunk of chunks) {
        const dataLine = chunk.trim();
        if (!dataLine.startsWith("data:")) continue;

        try {
          const event: ProgressEvent = JSON.parse(dataLine.slice(5).trim());
          setProgress(event.progress);
          setCurrentStep(stepIndex(event.step));
          addLog(event.message);

          if (event.tc_masked) setExtracted((prev) => ({ ...prev, tc_masked: event.tc_masked }));
          if (event.barcode) setExtracted((prev) => ({ ...prev, barcode: event.barcode }));
          if (event.result) setResult(event.result);
          if (event.student) setStudent(event.student);

          if (event.step === "complete" || event.step === "registered") {
            setPhase("done");
          }
          if (event.step === "registration_failed") {
            setPhase("error");
            setErrorMsg("Belge doğrulanmadığı için kayıt oluşturulmadı.");
          }
        } catch {
          // SSE parçası bozuksa akışı kesmeden devam et.
        }
      }
    }
  };

  const validateRegisterForm = () => {
    if (!registerForm.fullName.trim()) return "Ad soyad zorunludur.";
    if (!registerForm.email.trim()) return "E-posta zorunludur.";
    if (!registerForm.phone.trim()) return "Telefon zorunludur.";
    if (!registerForm.university.trim()) return "Üniversite zorunludur.";
    if (!registerForm.department.trim()) return "Bölüm zorunludur.";
    if (!registerForm.classLevel) return "Sınıf seçimi zorunludur.";
    if (registerForm.password.length < 8) return "Şifre en az 8 karakter olmalıdır.";
    if (registerForm.password !== registerForm.confirmPassword) return "Şifreler eşleşmiyor.";
    if (!file) return "Öğrenci belgesi PDF'i zorunludur.";
    return null;
  };

  const startRegistration = async () => {
    const validationError = validateRegisterForm();
    if (validationError || !file) {
      setErrorMsg(validationError ?? "PDF seçilmedi.");
      return;
    }

    setPhase("uploading");
    setProgress(5);
    setCurrentStep(-1);
    setLogs([]);
    setExtracted({});
    setResult(null);
    setErrorMsg("");

    const form = new FormData();
    form.append("file", file);
    form.append("full_name", registerForm.fullName.trim());
    form.append("email", registerForm.email.trim().toLowerCase());
    form.append("phone", registerForm.phone.trim());
    form.append("university", registerForm.university.trim());
    form.append("department", registerForm.department.trim());
    form.append("class_level", registerForm.classLevel);
    form.append("password", registerForm.password);
    if (registerForm.tcOverride.trim()) form.append("tc_override", registerForm.tcOverride.trim());
    if (registerForm.barcodeOverride.trim()) {
      form.append("barcode_override", registerForm.barcodeOverride.trim().toUpperCase());
    }

    try {
      const response = await fetch(`${BACKEND}/students/register/stream`, {
        method: "POST",
        body: form,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: "Kayıt başlatılamadı." }));
        throw new Error(error.detail ?? "Kayıt başlatılamadı.");
      }

      await consumeProgressStream(response);
    } catch (error) {
      setErrorMsg(parseError(error));
      setPhase("error");
    }
  };

  const startVerification = async () => {
    if (!file) {
      setErrorMsg("Doğrulamak için PDF seçin.");
      return;
    }

    setPhase("uploading");
    setProgress(5);
    setCurrentStep(-1);
    setLogs([]);
    setExtracted({});
    setResult(null);
    setErrorMsg("");

    const form = new FormData();
    form.append("file", file);

    try {
      const response = await fetch(`${BACKEND}/verify/stream`, {
        method: "POST",
        body: form,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: "Doğrulama başlatılamadı." }));
        throw new Error(error.detail ?? "Doğrulama başlatılamadı.");
      }

      await consumeProgressStream(response);
    } catch (error) {
      setErrorMsg(parseError(error));
      setPhase("error");
    }
  };

  const handleLogin = async () => {
    if (!loginEmail.trim() || !loginPassword) {
      setErrorMsg("E-posta ve şifre zorunludur.");
      return;
    }

    setAuthLoading(true);
    setErrorMsg("");

    try {
      const response = await fetch(`${BACKEND}/students/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: loginEmail.trim().toLowerCase(),
          password: loginPassword,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: "Giriş yapılamadı." }));
        throw new Error(error.detail ?? "Giriş yapılamadı.");
      }

      const data = (await response.json()) as { student: Student };
      setStudent(data.student);
      resetVerification();
    } catch (error) {
      setErrorMsg(parseError(error));
    } finally {
      setAuthLoading(false);
    }
  };

  const signOut = () => {
    setStudent(null);
    setLoginPassword("");
    resetVerification();
  };

  return (
    <main className="min-h-screen bg-[#f6f3ec] text-[#1d2428]">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#d7d0c3] pb-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#876f3d]">
              dentel öğrenci onayı
            </p>
            <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-4xl">
              YÖK öğrenci belgesi kontrol paneli
            </h1>
          </div>
          <a
            href={EDEVLET_STUDENT_CERTIFICATE_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-[#1d2428] bg-[#1d2428] px-4 text-sm font-bold text-white transition hover:bg-[#303b40]"
          >
            e-Devlet Belge Al
          </a>
        </header>

        <section className="grid flex-1 gap-6 py-6 lg:grid-cols-[390px_minmax(0,1fr)]">
          <aside className="rounded-lg border border-[#d7d0c3] bg-white p-4 shadow-sm">
            {student ? (
              <div className="space-y-4">
                <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
                    Doğrulanmış giriş
                  </p>
                  <p className="mt-2 text-xl font-black">{student.full_name}</p>
                  <p className="mt-1 text-sm text-[#657176]">{student.email}</p>
                </div>

                <div className="grid gap-2 text-sm">
                  <InfoLine label="Üniversite" value={student.university} />
                  <InfoLine label="Bölüm" value={student.department} />
                  <InfoLine label="Sınıf" value={student.class_level} />
                  <InfoLine label="TC" value={student.tc_masked ?? "Maskelenmiş"} />
                </div>

                <button
                  type="button"
                  onClick={signOut}
                  className="w-full rounded-md border border-[#d7d0c3] px-4 py-3 text-sm font-bold text-[#1d2428] transition hover:bg-[#f6f3ec]"
                >
                  Çıkış Yap
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="grid grid-cols-2 rounded-md border border-[#d7d0c3] bg-[#f6f3ec] p-1">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("login");
                      setErrorMsg("");
                    }}
                    className={`rounded px-3 py-2 text-sm font-bold transition ${
                      authMode === "login" ? "bg-white shadow-sm" : "text-[#657176]"
                    }`}
                  >
                    Giriş Yap
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("register");
                      setErrorMsg("");
                    }}
                    className={`rounded px-3 py-2 text-sm font-bold transition ${
                      authMode === "register" ? "bg-white shadow-sm" : "text-[#657176]"
                    }`}
                  >
                    Kayıt Ol
                  </button>
                </div>

                {authMode === "login" ? (
                  <div className="space-y-3">
                    <Field
                      label="E-posta"
                      type="email"
                      value={loginEmail}
                      onChange={setLoginEmail}
                      placeholder="ogrenci@st.uskudar.edu.tr"
                    />
                    <Field
                      label="Şifre"
                      type="password"
                      value={loginPassword}
                      onChange={setLoginPassword}
                      placeholder="Şifreniz"
                    />
                    <button
                      type="button"
                      onClick={handleLogin}
                      disabled={authLoading}
                      className="w-full rounded-md bg-[#1d2428] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#303b40] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {authLoading ? "Kontrol ediliyor..." : "Giriş Yap"}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Field
                      label="Ad Soyad"
                      value={registerForm.fullName}
                      onChange={(value) => updateRegisterField("fullName", value)}
                      placeholder="Adınız Soyadınız"
                    />
                    <Field
                      label="E-posta"
                      type="email"
                      value={registerForm.email}
                      onChange={(value) => updateRegisterField("email", value)}
                      placeholder="ogrenci@st.uskudar.edu.tr"
                    />
                    <Field
                      label="Telefon"
                      value={registerForm.phone}
                      onChange={(value) => updateRegisterField("phone", value)}
                      placeholder="05XX XXX XX XX"
                    />
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                      <Field
                        label="Üniversite"
                        value={registerForm.university}
                        onChange={(value) => updateRegisterField("university", value)}
                      />
                      <Field
                        label="Bölüm"
                        value={registerForm.department}
                        onChange={(value) => updateRegisterField("department", value)}
                      />
                    </div>
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.16em] text-[#657176]">
                        Sınıf
                      </span>
                      <select
                        value={registerForm.classLevel}
                        onChange={(event) => updateRegisterField("classLevel", event.target.value)}
                        className="min-h-11 w-full rounded-md border border-[#cfc6b7] bg-white px-3 text-sm outline-none transition focus:border-[#1d2428]"
                      >
                        <option value="">Seçin</option>
                        {CLASS_LEVELS.map((level) => (
                          <option key={level} value={level}>
                            {level}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                      <Field
                        label="Şifre"
                        type="password"
                        value={registerForm.password}
                        onChange={(value) => updateRegisterField("password", value)}
                        placeholder="En az 8 karakter"
                      />
                      <Field
                        label="Şifre Tekrar"
                        type="password"
                        value={registerForm.confirmPassword}
                        onChange={(value) => updateRegisterField("confirmPassword", value)}
                        placeholder="Tekrar girin"
                      />
                    </div>
                    <details className="rounded-md border border-[#d7d0c3] bg-[#fbfaf7] p-3">
                      <summary className="cursor-pointer text-sm font-bold text-[#1d2428]">
                        Manuel barkod / TC
                      </summary>
                      <div className="mt-3 grid gap-3">
                        <Field
                          label="TC Kimlik No"
                          value={registerForm.tcOverride}
                          onChange={(value) =>
                            updateRegisterField("tcOverride", value.replace(/\D/g, "").slice(0, 11))
                          }
                          placeholder="PDF okunamazsa"
                        />
                        <Field
                          label="Barkod"
                          value={registerForm.barcodeOverride}
                          onChange={(value) =>
                            updateRegisterField(
                              "barcodeOverride",
                              value.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 30)
                            )
                          }
                          placeholder="YÖK belge barkodu"
                        />
                      </div>
                    </details>
                  </div>
                )}

                {errorMsg && !isRunning && (
                  <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                    {errorMsg}
                  </div>
                )}
              </div>
            )}
          </aside>

          <section className="flex flex-col gap-5">
            <div className="rounded-lg border border-[#d7d0c3] bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#876f3d]">
                    {student ? "Belge kontrol" : "Kayıt belgesi"}
                  </p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight">
                    e-Devlet YÖK öğrenci belgesi
                  </h2>
                </div>
                <span className="rounded-full border border-[#d7d0c3] px-3 py-1 text-xs font-bold text-[#657176]">
                  {selectedStepLabel}
                </span>
              </div>

              <div
                onDrop={onDrop}
                onDragOver={onDragOver}
                onDragLeave={() => setDragOver(false)}
                onClick={() => fileInputRef.current?.click()}
                className={`mt-5 cursor-pointer rounded-lg border-2 border-dashed p-5 transition ${
                  dragOver
                    ? "border-[#1d2428] bg-[#f6f3ec]"
                    : file
                      ? "border-emerald-300 bg-emerald-50"
                      : "border-[#d7d0c3] bg-[#fbfaf7] hover:border-[#1d2428]"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={(event) => {
                    const nextFile = event.target.files?.[0];
                    if (nextFile) handleFile(nextFile);
                  }}
                />
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-black">
                      {file ? file.name : "Öğrenci belgesi PDF'i seçin"}
                    </p>
                    <p className="mt-1 text-sm text-[#657176]">
                      {file ? `${formatFileSize(file.size)} · değiştirmek için tıklayın` : "YÖK öğrenci belgesi sorgulama çıktısı"}
                    </p>
                  </div>
                  <span className="inline-flex min-h-10 items-center justify-center rounded-md bg-white px-3 text-sm font-bold text-[#1d2428] shadow-sm">
                    PDF Seç
                  </span>
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                {!student && authMode === "register" ? (
                  <button
                    type="button"
                    onClick={startRegistration}
                    disabled={!file || isRegistering}
                    className="min-h-11 flex-1 rounded-md bg-[#ad7a00] px-4 text-sm font-black text-white transition hover:bg-[#946900] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isRegistering ? "Kayıt doğrulanıyor..." : "Belgeyle Kayıt Ol"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={startVerification}
                    disabled={!student || !file || isRunning}
                    className="min-h-11 flex-1 rounded-md bg-[#1d2428] px-4 text-sm font-black text-white transition hover:bg-[#303b40] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isRunning ? "Doğrulanıyor..." : "Belgeyi Doğrula"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={resetVerification}
                  className="min-h-11 rounded-md border border-[#d7d0c3] px-4 text-sm font-bold text-[#1d2428] transition hover:bg-[#f6f3ec]"
                >
                  Temizle
                </button>
              </div>

              <div className="mt-5">
                <div className="flex justify-between text-xs font-bold uppercase tracking-[0.16em] text-[#657176]">
                  <span>İlerleme</span>
                  <span>{progress}%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#ece5da]">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      phase === "done" && result?.valid === true
                        ? "bg-emerald-500"
                        : phase === "done" && result?.valid === false
                          ? "bg-red-500"
                          : "bg-[#1d2428]"
                    }`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {STEPS.map((step, index) => (
                    <span
                      key={step.key}
                      className={`rounded-full px-2 py-1 text-[11px] font-bold ${
                        index < currentStep
                          ? "bg-[#1d2428] text-white"
                          : index === currentStep
                            ? "bg-[#ad7a00] text-white"
                            : "bg-[#f1ede5] text-[#7f898d]"
                      }`}
                    >
                      {step.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {(extracted.tc_masked || extracted.barcode || logs.length > 0 || result || errorMsg) && (
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div className="rounded-lg border border-[#d7d0c3] bg-white p-5 shadow-sm">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#876f3d]">
                    İşlem kaydı
                  </p>
                  <div className="mt-4 max-h-64 space-y-2 overflow-y-auto pr-1">
                    {logs.length === 0 ? (
                      <p className="text-sm text-[#657176]">Henüz işlem başlamadı.</p>
                    ) : (
                      logs.map((log, index) => (
                        <div
                          key={`${log}-${index}`}
                          className="grid grid-cols-[32px_minmax(0,1fr)] gap-3 text-sm"
                        >
                          <span className="font-mono text-xs text-[#9a8f80]">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          <span>{log}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-lg border border-[#d7d0c3] bg-white p-5 shadow-sm">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#876f3d]">
                    Sonuç
                  </p>
                  <div className="mt-4 space-y-3">
                    {extracted.tc_masked && <InfoLine label="TC" value={extracted.tc_masked} />}
                    {extracted.barcode && <InfoLine label="Barkod" value={extracted.barcode} />}
                    {result ? (
                      <div
                        className={`rounded-md border p-3 ${
                          result.valid === true
                            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                            : result.valid === false
                              ? "border-red-200 bg-red-50 text-red-800"
                              : "border-amber-200 bg-amber-50 text-amber-800"
                        }`}
                      >
                        <p className="text-lg font-black">{result.valid_label}</p>
                        {result.error && <p className="mt-1 text-sm">{result.error}</p>}
                      </div>
                    ) : null}
                    {errorMsg && (
                      <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
                        {errorMsg}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "text" | "email" | "password";
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.16em] text-[#657176]">
        {label}
      </span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-11 w-full rounded-md border border-[#cfc6b7] bg-white px-3 text-sm outline-none transition placeholder:text-[#9ba3a6] focus:border-[#1d2428]"
      />
    </label>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-[#fbfaf7] px-3 py-2">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#7f898d]">
        {label}
      </p>
      <p className="mt-1 text-sm font-bold text-[#1d2428]">{value}</p>
    </div>
  );
}
