import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const IMAGE_FIELDS = [
  { key: "userImage", label: "Profile photo", icon: "👤", url: "userImageUrl" },
  { key: "cardImage", label: "ID card", icon: "🪪", url: "cardImageUrl" },
  { key: "iqamaImage", label: "Iqama", icon: "📄", url: "iqamaImageUrl" },
  { key: "qrCode1", label: "QR code 1", icon: "▦", url: "qrCode1Url" },
  { key: "drivingLicenseImage", label: "Driving licence", icon: "🚘", url: "drivingLicenseImageUrl" },
  { key: "qrCode2", label: "QR code 2", icon: "▦", url: "qrCode2Url" },
];
const EMPTY_FORM = { name: "", idNo: "", phone: "", password: "" };

async function api(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, { credentials: "include", ...options });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || `Request failed (${response.status})`);
  return data;
}

export default function App() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [files, setFiles] = useState({});
  const [previews, setPreviews] = useState({});
  const [removedImages, setRemovedImages] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [query, setQuery] = useState("");
  const [theme, setTheme] = useState(() => localStorage.getItem("people_theme") || "light");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [login, setLogin] = useState({ username: "", password: "" });
  const [loginLoading, setLoginLoading] = useState(false);
  const inputRefs = useRef({});

  const notify = (type, message) => {
    setToast({ type, message });
    window.clearTimeout(notify.timer);
    notify.timer = window.setTimeout(() => setToast(null), 3500);
  };

  const loadItems = async () => {
    const data = await api("/items");
    setItems(Array.isArray(data.items) ? data.items : []);
  };

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("people_theme", theme);
  }, [theme]);

  useEffect(() => {
    api("/auth/me")
      .then(() => { setAuthenticated(true); return loadItems(); })
      .catch(() => setAuthenticated(false))
      .finally(() => setInitialLoading(false));
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    try {
      await api("/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(login) });
      setAuthenticated(true);
      setLogin({ username: "", password: "" });
      await loadItems();
      notify("success", "Welcome back");
    } catch (err) { notify("error", err.message); }
    finally { setLoginLoading(false); }
  };

  const handleLogout = async () => {
    try { await api("/auth/logout", { method: "POST" }); } catch { /* session may already have expired */ }
    setAuthenticated(false); setItems([]); resetForm();
  };

  const resetForm = () => {
    Object.values(previews).forEach((url) => { if (url?.startsWith("blob:")) URL.revokeObjectURL(url); });
    setForm(EMPTY_FORM); setFiles({}); setPreviews({}); setRemovedImages([]); setEditingId(null); setShowPassword(false);
    Object.values(inputRefs.current).forEach((el) => { if (el) el.value = ""; });
  };

  const handleImage = (key, file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return notify("error", "Please choose an image file");
    if (file.size > 5 * 1024 * 1024) return notify("error", "Each image must be 5 MB or smaller");
    setPreviews((old) => {
      if (old[key]?.startsWith("blob:")) URL.revokeObjectURL(old[key]);
      return { ...old, [key]: URL.createObjectURL(file) };
    });
    setFiles((old) => ({ ...old, [key]: file }));
    setRemovedImages((old) => old.filter((name) => name !== key));
