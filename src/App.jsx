import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

// ✅ Apne Vercel backend ka URL yahan daalein (aapke project ka asli link)
const API_URL = "https://absher-deshboard-backend.vercel.app/api/items";


const EMPTY_FORM = {
  name: "",
  idNo: "",
  phone: "",
  password: "",
};

// Client-side image compression (Vercel request body limit ~4.5MB hai,
// isliye badi images ko chhota kar ke bhejte hain)
const compressImage = (file) =>
  new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const MAX = 1200;
      let { width, height } = img;
      if (width > MAX || height > MAX) {
        const ratio = Math.min(MAX / width, MAX / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob && blob.size < file.size) {
            resolve(new File([blob], file.name, { type: "image/jpeg" }));
          } else {
            resolve(file);
          }
        },
        "image/jpeg",
        0.8
      );
    };
    img.onerror = () => resolve(file);
    img.src = objectUrl;
  });

export default function App() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);

  // States for all 6 images
  const [userFile, setUserFile] = useState(null);
  const [userPreview, setUserPreview] = useState(null);

  const [cardFile, setCardFile] = useState(null);
  const [cardPreview, setCardPreview] = useState(null);

  const [iqamaFile, setIqamaFile] = useState(null);
  const [iqamaPreview, setIqamaPreview] = useState(null);

  const [qr1File, setQr1File] = useState(null);
  const [qr1Preview, setQr1Preview] = useState(null);

  const [licenseFile, setLicenseFile] = useState(null);
  const [licensePreview, setLicensePreview] = useState(null);

  const [qr2File, setQr2File] = useState(null);
  const [qr2Preview, setQr2Preview] = useState(null);

  const [editingId, setEditingId] = useState(null);
  const [query, setQuery] = useState("");
  const [theme, setTheme] = useState(localStorage.getItem("people_theme") || "light");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  // Refs for file inputs
  const userFileInputRef = useRef(null);
  const cardFileInputRef = useRef(null);
  const iqamaFileInputRef = useRef(null);
  const qr1FileInputRef = useRef(null);
  const licenseFileInputRef = useRef(null);
  const qr2FileInputRef = useRef(null);

  useEffect(() => {
    const loadPeople = async () => {
      try {
        setLoading(true);
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error("Failed to load records");
        const data = await response.json();
        setItems(data.items || []);
      } catch (error) {
        console.error("Load error:", error);
        showToast("error", "MongoDB se records load nahi ho rahe");
      } finally {
        setLoading(false);
      }
    };
    loadPeople();
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("people_theme", theme);
  }, [theme]);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const handleInput = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const pickFile = async (selectedFile, type) => {
    const map = {
      user: [setUserFile, setUserPreview, userFileInputRef],
      card: [setCardFile, setCardPreview, cardFileInputRef],
      iqama: [setIqamaFile, setIqamaPreview, iqamaFileInputRef],
      qr1: [setQr1File, setQr1Preview, qr1FileInputRef],
      license: [setLicenseFile, setLicensePreview, licenseFileInputRef],
      qr2: [setQr2File, setQr2Preview, qr2FileInputRef],
    };
    const entry = map[type];
    if (!entry) return;
    const [setFile, setPreview, inputRef] = entry;

    if (!selectedFile) {
      setFile(null);
      setPreview(null);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    if (!selectedFile.type.startsWith("image/")) {
      showToast("error", "Sirf image file select karein");
      return;
    }

    // Badi image ko chhota kar do (Vercel limit ke liye)
    const compressed = await compressImage(selectedFile);

    if (compressed.size > 5 * 1024 * 1024) {
      showToast("error", "Image maximum 5MB honi chahiye");
      return;
    }

    setFile(compressed);
    setPreview(URL.createObjectURL(compressed));
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setUserFile(null);
    setUserPreview(null);
    setCardFile(null);
    setCardPreview(null);
    setIqamaFile(null);
    setIqamaPreview(null);
    setQr1File(null);
    setQr1Preview(null);
    setLicenseFile(null);
    setLicensePreview(null);
    setQr2File(null);
    setQr2Preview(null);
    setEditingId(null);
    setShowPassword(false);
    if (userFileInputRef.current) userFileInputRef.current.value = "";
    if (cardFileInputRef.current) cardFileInputRef.current.value = "";
    if (iqamaFileInputRef.current) iqamaFileInputRef.current.value = "";
    if (qr1FileInputRef.current) qr1FileInputRef.current.value = "";
    if (licenseFileInputRef.current) licenseFileInputRef.current.value = "";
    if (qr2FileInputRef.current) qr2FileInputRef.current.value = "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    if (!form.name.trim()) return showToast("error", "Name zaroori hai");
    if (!form.idNo.trim()) return showToast("error", "ID No zaroori hai");
    if (!form.phone.trim()) return showToast("error", "Phone Number zaroori hai");
    if (!form.password.trim()) return showToast("error", "Password zaroori hai");

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append("name", form.name.trim());
      formData.append("idNo", form.idNo.trim());
      formData.append("phone", form.phone.trim());
      formData.append("password", form.password.trim());

      if (userFile) formData.append("userImage", userFile);
      if (cardFile) formData.append("cardImage", cardFile);
      if (iqamaFile) formData.append("iqamaImage", iqamaFile);
      if (qr1File) formData.append("qrCode1", qr1File);
      if (licenseFile) formData.append("drivingLicenseImage", licenseFile);
      if (qr2File) formData.append("qrCode2", qr2File);

      if (editingId) {
        const response = await fetch(`${API_URL}/${editingId}`, {
          method: "PUT",
          body: formData,
        });

        if (!response.ok) throw new Error("Update failed");

        const data = await response.json();
        setItems((prev) => prev.map((item) => (item._id === editingId ? data.item : item)));
        showToast("success", "Record successfully updated");
      } else {
        const response = await fetch(API_URL, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) throw new Error("Create failed");

        const data = await response.json();
        setItems((prev) => [data.item, ...prev]);
        showToast("success", "New record MongoDB mein save ho gaya");
      }

      resetForm();
    } catch (error) {
      console.error("Submit error:", error);
      showToast("error", "Server par data save nahi ho saka");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item) => {
    setEditingId(item._id);
    setForm({
      name: item.name || "",
      idNo: item.idNo || "",
      phone: item.phone || "",
      password: item.password || "",
    });
    setUserPreview(item.userImageUrl || null);
    setCardPreview(item.cardImageUrl || null);
    setIqamaPreview(item.iqamaImageUrl || null);
    setQr1Preview(item.qrCode1Url || null);
    setLicensePreview(item.drivingLicenseImageUrl || null);
    setQr2Preview(item.qrCode2Url || null);
    setUserFile(null);
    setCardFile(null);
    setIqamaFile(null);
    setQr1File(null);
    setLicenseFile(null);
    setQr2File(null);
    setShowPassword(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    const item = items.find((x) => x._id === id);
    if (!item) return;

    if (!window.confirm(`Kya "${item.name}" ka record delete karna hai?`)) return;

    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Delete failed");

      setItems((prev) => prev.filter((x) => x._id !== id));
      if (editingId === id) resetForm();
      showToast("success", "Record successfully delete ho gaya");
    } catch (error) {
      console.error("Delete error:", error);
      showToast("error", "Record delete nahi ho saka");
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = useMemo(() => {
    const search = query.trim().toLowerCase();
    const currentItems = Array.isArray(items) ? items : items.items || [];
    if (!search) return currentItems;

    return currentItems.filter((item) =>
      item.name?.toLowerCase().includes(search) ||
      item.idNo?.toLowerCase().includes(search) ||
      item.phone?.toLowerCase().includes(search)
    );
  }, [items, query]);

  const totalRecords = Array.isArray(items) ? items.length : 0;
  const totalPhotos = (Array.isArray(items) ? items : items.items || []).filter(
    (item) => item.userImageUrl || item.cardImageUrl || item.iqamaImageUrl || item.qrCode1Url || item.drivingLicenseImageUrl || item.qrCode2Url
  ).length;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="brand-icon">👥</div>
          <div>
            <h1>PeopleHub</h1>
            <span>People Directory</span>
          </div>
        </div>
        <div className="top-actions">
          <div className="search-box">
            <span>🔍</span>
            <input type="text" placeholder="Search name, ID or phone..." value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <button className="theme-btn" onClick={() => setTheme(theme === "light" ? "dark" : "light")}>
            {theme === "light" ? "🌙" : "☀️"}
          </button>
        </div>
      </header>

      <main className="container">
        <section className="hero">
          <div>
            <p className="eyebrow">MONGODB DIRECTORY</p>
            <h2>Manage your people<br />records easily.</h2>
            <p className="hero-text">Add, edit, search and manage your records from one place.</p>
          </div>
          <div className="stats">
            <div className="stat-card">
              <strong>{totalRecords}</strong>
              <span>Total Records</span>
            </div>
            <div className="stat-card">
              <strong>{totalPhotos}</strong>
              <span>Photos Uploaded</span>
            </div>
          </div>
        </section>

        <section className="form-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">{editingId ? "EDIT RECORD" : "NEW RECORD"}</p>
              <h3>{editingId ? "Update Person" : "Add New Person"}</h3>
            </div>
            {editingId && (
              <button type="button" className="cancel-btn" onClick={resetForm}>Cancel</button>
            )}
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="field">
                <label>Name</label>
                <input type="text" name="name" value={form.name} onChange={handleInput} placeholder="Enter full name" />
              </div>

              <div className="field">
                <label>ID Number</label>
                <input type="text" name="idNo" value={form.idNo} onChange={handleInput} placeholder="Enter ID number" />
              </div>

              <div className="field">
                <label>Phone Number</label>
                <input type="tel" name="phone" value={form.phone} onChange={handleInput} placeholder="Enter phone number" />
              </div>

          <div className="field">
  <label>Password</label>
  <div className="password-input-group">
    <input
      type={showPassword ? "text" : "password"}
      name="password"
      value={form.password}
      onChange={handleInput}
      placeholder="Enter password"
    />
    <button
      type="button"
      className="password-toggle-btn"
      onClick={() => setShowPassword(!showPassword)}
      title={showPassword ? "Hide Password" : "Show Password"}
    >
      {showPassword ? "👁️" : "🙈"}
    </button>
  </div>
</div>

              <div className="field">
                <label>User Profile Image</label>
                <div className="image-upload">
                  {userPreview ? (
                    <div className="image-preview">
                      <img src={userPreview} alt="User Preview" />
                      <button type="button" onClick={() => pickFile(null, 'user')}>×</button>
                    </div>
                  ) : (
                    <label className="upload-box">
                      <input ref={userFileInputRef} type="file" accept="image/*" onChange={(e) => pickFile(e.target.files?.[0], 'user')} />
                      <span className="upload-icon">👤</span>
                      <span>Choose User Image</span>
                      <small>JPG, PNG up to 5MB</small>
                    </label>
                  )}
                </div>
              </div>

              {/* <div className="field">
                <label>ID Card Image</label>
                <div className="image-upload">
                  {cardPreview ? (
                    <div className="image-preview">
                      <img src={cardPreview} alt="Card Preview" />
                      <button type="button" onClick={() => pickFile(null, 'card')}>×</button>
                    </div>
                  ) : (
                    <label className="upload-box">
                      <input ref={cardFileInputRef} type="file" accept="image/*" onChange={(e) => pickFile(e.target.files?.[0], 'card')} />
                      <span className="upload-icon">🪪</span>
                      <span>Choose Card Image</span>
                      <small>JPG, PNG up to 5MB</small>
                    </label>
                  )}
                </div>
              </div> */}

              <div className="field">
                <label>Iqama Image</label>
                <div className="image-upload">
                  {iqamaPreview ? (
                    <div className="image-preview">
                      <img src={iqamaPreview} alt="Iqama Preview" />
                      <button type="button" onClick={() => pickFile(null, 'iqama')}>×</button>
                    </div>
                  ) : (
                    <label className="upload-box">
                      <input ref={iqamaFileInputRef} type="file" accept="image/*" onChange={(e) => pickFile(e.target.files?.[0], 'iqama')} />
                      <span className="upload-icon">📄</span>
                      <span>Choose Iqama Image</span>
                      <small>JPG, PNG up to 5MB</small>
                    </label>
                  )}
                </div>
              </div>

              <div className="field">
                <label>QR Code 1</label>
                <div className="image-upload">
                  {qr1Preview ? (
                    <div className="image-preview">
                      <img src={qr1Preview} alt="QR Code 1 Preview" />
                      <button type="button" onClick={() => pickFile(null, 'qr1')}>×</button>
                    </div>
                  ) : (
                    <label className="upload-box">
                      <input ref={qr1FileInputRef} type="file" accept="image/*" onChange={(e) => pickFile(e.target.files?.[0], 'qr1')} />
                      <span className="upload-icon">🔗</span>
                      <span>Choose QR Code 1</span>
                      <small>JPG, PNG up to 5MB</small>
                    </label>
                  )}
                </div>
              </div>

              <div className="field">
                <label>Driving License Image</label>
                <div className="image-upload">
                  {licensePreview ? (
                    <div className="image-preview">
                      <img src={licensePreview} alt="License Preview" />
                      <button type="button" onClick={() => pickFile(null, 'license')}>×</button>
                    </div>
                  ) : (
                    <label className="upload-box">
                      <input ref={licenseFileInputRef} type="file" accept="image/*" onChange={(e) => pickFile(e.target.files?.[0], 'license')} />
                      <span className="upload-icon">🚗</span>
                      <span>Choose License Image</span>
                      <small>JPG, PNG up to 5MB</small>
                    </label>
                  )}
                </div>
              </div>

              <div className="field">
                <label>QR Code 2</label>
                <div className="image-upload">
                  {qr2Preview ? (
                    <div className="image-preview">
                      <img src={qr2Preview} alt="QR Code 2 Preview" />
                      <button type="button" onClick={() => pickFile(null, 'qr2')}>×</button>
                    </div>
                  ) : (
                    <label className="upload-box">
                      <input ref={qr2FileInputRef} type="file" accept="image/*" onChange={(e) => pickFile(e.target.files?.[0], 'qr2')} />
                      <span className="upload-icon">🔗</span>
                      <span>Choose QR Code 2</span>
                      <small>JPG, PNG up to 5MB</small>
                    </label>
                  )}
                </div>
              </div>
            </div>

            <div className="form-footer">
              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? "Saving..." : editingId ? "Update Record" : "Add Record"}
              </button>
            </div>
          </form>
        </section>

        <section className="records-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">DIRECTORY</p>
              <h3>People Records</h3>
            </div>
            <span className="record-count">{filteredItems.length} records</span>
          </div>

          {loading && items.length === 0 ? (
            <div className="empty-state">
              <div>⏳</div>
              <h4>Loading records...</h4>
              <p>MongoDB se data load ho raha hai.</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="empty-state">
              <div>👤</div>
              <h4>No records found</h4>
              <p>Abhi koi person record available nahi hai.</p>
            </div>
          ) : (
            <div className="records-grid">
              {filteredItems.map((item) => (
                <article className="person-card" key={item._id}>

                  <div className="person-images-container" style={{ display: 'flex', gap: '10px', height: '120px' }}>
                    <div className="person-image" style={{ flex: 1, height: '100%' }}>
                      {item.userImageUrl ? (
                        <img src={item.userImageUrl} alt="User Profile" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} />
                      ) : (
                        <div className="no-image" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>👤</div>
                      )}
                    </div>

                    <div className="person-image" style={{ flex: 1, height: '100%' }}>
                      {item.cardImageUrl ? (
                        <img src={item.cardImageUrl} alt="ID Card" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} />
                      ) : (
                        <div className="no-image" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🪪</div>
                      )}
                    </div>
                  </div>

                  <div className="person-images-container" style={{ display: 'flex', gap: '10px', height: '100px', marginTop: '10px' }}>
                    <div className="person-image" style={{ flex: 1, height: '100%' }}>
                      {item.iqamaImageUrl ? (
                        <img src={item.iqamaImageUrl} alt="Iqama" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} />
                      ) : (
                        <div className="no-image" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>📄</div>
                      )}
                    </div>

                    <div className="person-image" style={{ flex: 1, height: '100%' }}>
                      {item.qrCode1Url ? (
                        <img src={item.qrCode1Url} alt="QR Code 1" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} />
                      ) : (
                        <div className="no-image" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🔗</div>
                      )}
                    </div>

                    <div className="person-image" style={{ flex: 1, height: '100%' }}>
                      {item.drivingLicenseImageUrl ? (
                        <img src={item.drivingLicenseImageUrl} alt="Driving License" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} />
                      ) : (
                        <div className="no-image" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🚗</div>
                      )}
                    </div>

                    <div className="person-image" style={{ flex: 1, height: '100%' }}>
                      {item.qrCode2Url ? (
                        <img src={item.qrCode2Url} alt="QR Code 2" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} />
                      ) : (
                        <div className="no-image" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🔗</div>
                      )}
                    </div>
                  </div>

                  <div className="person-info">
                    <h4>{item.name}</h4>
                    <div className="person-detail">
                      <span>🪪</span>
                      <span>{item.idNo}</span>
                    </div>
                    <div className="person-detail">
                      <span>📱</span>
                      <span>{item.phone}</span>
                    </div>
                    <div className="person-detail">
                      <span>🔑</span>
                      <span>{item.password ? '••••••••' : 'N/A'}</span>
                    </div>
                  </div>
                  <div className="card-actions">
                    <button type="button" className="edit-vtn" onClick={() => handleEdit(item)}>✏️ Edit</button>
                    <button type="button" className="delete-btn" onClick={() => handleDelete(item._id)}>🗑️ Delete</button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      {toast && (
        <div className={`toast ${toast.type}`}>
          <span>{toast.type === "success" ? "✓" : "⚠"}</span>
          <p>{toast.message}</p>
        </div>
      )}
    </div>
  );
}
