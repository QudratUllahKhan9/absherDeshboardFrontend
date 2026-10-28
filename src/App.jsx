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
  };

  const removeImage = (field) => {
    const key = field.key;
    setFiles((old) => { const next = { ...old }; delete next[key]; return next; });
    setPreviews((old) => { if (old[key]?.startsWith("blob:")) URL.revokeObjectURL(old[key]); const next = { ...old }; delete next[key]; return next; });
    if (editingId) setRemovedImages((old) => [...new Set([...old, key])]);
    if (inputRefs.current[key]) inputRefs.current[key].value = "";
  };

  const startEdit = (item) => {
    resetForm();
    setEditingId(item._id);
    setForm({ name: item.name || "", idNo: item.idNo || "", phone: item.phone || "", password: "" });
    const existing = {};
    IMAGE_FIELDS.forEach((field) => { if (item[field.url]) existing[field.key] = item[field.url]; });
    setPreviews(existing);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    if (!form.name.trim() || !form.idNo.trim() || !form.phone.trim()) return notify("error", "Name, ID number and phone are required");
    if (!editingId && form.password.length < 12) return notify("error", "Use a password with at least 12 characters");
    if (editingId && form.password && form.password.length < 12) return notify("error", "New password must be at least 12 characters");
    setLoading(true);
    try {
      const body = new FormData();
      body.append("name", form.name.trim()); body.append("idNo", form.idNo.trim()); body.append("phone", form.phone.trim());
      if (form.password) body.append("password", form.password);
      body.append("removedImages", JSON.stringify(removedImages));
      IMAGE_FIELDS.forEach(({ key }) => { if (files[key]) body.append(key, files[key]); });
      const data = await api(editingId ? `/items/${editingId}` : "/items", { method: editingId ? "PUT" : "POST", body });
      if (editingId) setItems((old) => old.map((item) => item._id === editingId ? data.item : item));
      else setItems((old) => [data.item, ...old]);
      notify("success", editingId ? "Record updated securely" : "Record saved successfully");
      resetForm();
    } catch (err) { notify("error", err.message || "Could not save record"); }
    finally { setLoading(false); }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete the record for “${item.name}”? This cannot be undone.`)) return;
    setLoading(true);
    try { await api(`/items/${item._id}`, { method: "DELETE" }); setItems((old) => old.filter((x) => x._id !== item._id)); if (editingId === item._id) resetForm(); notify("success", "Record deleted"); }
    catch (err) { notify("error", err.message); }
    finally { setLoading(false); }
  };

  const filteredItems = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return items;
    return items.filter((item) => [item.name, item.idNo, item.phone].some((v) => String(v || "").toLowerCase().includes(term)));
  }, [items, query]);

  if (initialLoading) return <div className="loading-screen"><div className="spinner"/><p>Loading PeopleHub…</p></div>;

  if (!authenticated) return <main className="login-page"><form className="login-card" onSubmit={handleLogin}><div className="brand-mark">PH</div><p className="eyebrow">PRIVATE ADMIN WORKSPACE</p><h1>Welcome to PeopleHub</h1><p className="muted">Sign in to securely manage people records.</p><label>Username<input autoComplete="username" value={login.username} onChange={(e) => setLogin({ ...login, username: e.target.value })} required /></label><label>Password<input type="password" autoComplete="current-password" value={login.password} onChange={(e) => setLogin({ ...login, password: e.target.value })} required /></label><button className="primary-btn full" disabled={loginLoading}>{loginLoading ? "Signing in…" : "Sign in securely →"}</button><p className="tiny-note">Access is restricted to authorized administrators.</p></form>{toast && <Toast toast={toast}/>}</main>;

  const totalPhotos = items.filter((item) => IMAGE_FIELDS.some((f) => item[f.url])).length;
  return <div className="app-shell">
    <header className="topbar"><a className="brand" href="#top"><div className="brand-mark">PH</div><div><strong>PeopleHub</strong><span>Private people directory</span></div></a><div className="top-actions"><label className="search-box"><span>⌕</span><input aria-label="Search records" placeholder="Search name, ID or phone…" value={query} onChange={(e) => setQuery(e.target.value)}/><kbd>⌘ K</kbd></label><button className="icon-btn" onClick={() => setTheme(theme === "light" ? "dark" : "light")} aria-label="Toggle theme">{theme === "light" ? "☾" : "☀"}</button><button className="icon-btn logout-btn" onClick={handleLogout} title="Sign out">↗</button></div></header>
    <main className="container" id="top">
      <section className="hero"><div className="hero-copy"><span className="hero-tag"><i/> PRIVATE DIRECTORY</span><h1>Every record.<br/><em>One secure place.</em></h1><p>Organize people details and documents with a clear, simple workspace.</p><a className="hero-link" href="#records">Explore records <span>↓</span></a></div><div className="hero-art" aria-hidden="true"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="art-card art-card-back">▦<span>DOCUMENTS</span></div><div className="art-card art-card-front"><div className="art-avatar">✦</div><div className="art-lines"><b/><b/><b/></div><span className="art-status">● PRIVATE</span></div><div className="art-dot dot-one"/><div className="art-dot dot-two"/></div><div className="hero-bottom"><span>YOUR WORKSPACE</span><span>SECURITY-FIRST RECORDS <b>↗</b></span></div></section>
      <section className="stats-grid"><article className="stat-card"><span className="stat-icon purple">▤</span><div><p>Total records</p><strong>{items.length.toLocaleString()}</strong></div><small>Stored records</small></article><article className="stat-card"><span className="stat-icon mint">▧</span><div><p>Records with images</p><strong>{totalPhotos.toLocaleString()}</strong></div><small>Documents attached</small></article><article className="stat-card"><span className="stat-icon amber">⌕</span><div><p>Search results</p><strong>{filteredItems.length.toLocaleString()}</strong></div><small>Matching records</small></article></section>
      <section className="form-card" id="form"><div className="section-heading"><div><span className="eyebrow">{editingId ? "UPDATE EXISTING ENTRY" : "ADD TO DIRECTORY"}</span><h2>{editingId ? "Edit person record" : "Create a new record"}</h2><p>Fill in the details and attach any relevant documents.</p></div>{editingId && <button className="secondary-btn" type="button" onClick={resetForm}>Cancel edit ×</button>}</div>
        <form onSubmit={handleSubmit}><div className="form-grid"><label className="field"><span>Full name <b>*</b></span><input autoComplete="off" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Ahmed Khan" required maxLength={120}/></label><label className="field"><span>ID number <b>*</b></span><input autoComplete="off" value={form.idNo} onChange={(e) => setForm({ ...form, idNo: e.target.value })} placeholder="Enter identification number" required maxLength={80}/></label><label className="field"><span>Phone number <b>*</b></span><input type="tel" autoComplete="off" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Enter phone number" required maxLength={30}/></label><label className="field"><span>{editingId ? "Set a new password (optional)" : "Account password *"}</span><div className="password-wrap"><input type={showPassword ? "text" : "password"} autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={editingId ? "Leave blank to keep current password" : "At least 12 characters"} required={!editingId} minLength={12}/><button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? "Hide" : "Show"}</button></div><small className="field-help">Passwords are hashed on the server and never displayed in records.</small></label></div>
          <div className="upload-heading"><div><span className="eyebrow">DOCUMENT LIBRARY</span><h3>Photos & documents</h3></div><span className="file-limit">JPG, PNG, WEBP · Max 5 MB each</span></div><div className="upload-grid">{IMAGE_FIELDS.map((field) => <div className="upload-field" key={field.key}><div className="upload-label"><span>{field.icon}</span><b>{field.label}</b></div>{previews[field.key] ? <div className="preview-card"><img src={previews[field.key]} alt={`${field.label} preview`}/><div className="preview-overlay"><span>{files[field.key] ? "New upload" : "Saved image"}</span><button type="button" onClick={() => removeImage(field)} aria-label={`Remove ${field.label}`}>×</button></div><label className="replace-link">Replace image<input ref={(el) => { inputRefs.current[field.key] = el; }} type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => handleImage(field.key, e.target.files?.[0])}/></label></div> : <label className="upload-drop"><input ref={(el) => { inputRefs.current[field.key] = el; }} type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => handleImage(field.key, e.target.files?.[0])}/><span className="upload-plus">＋</span><b>Upload {field.label.toLowerCase()}</b><small>Choose a file from your device</small></label>}</div>)}</div>
          <div className="form-footer"><span className="required-note"><b>*</b> Required fields</span><div className="footer-actions">{editingId && <button type="button" className="secondary-btn" onClick={resetForm}>Discard changes</button>}<button className="primary-btn" disabled={loading}>{loading ? <><span className="button-spinner"/> Saving…</> : editingId ? "Save changes →" : "Save record →"}</button></div></div>
        </form>
      </section>
      <section className="records-section" id="records"><div className="section-heading records-heading"><div><span className="eyebrow">YOUR DIRECTORY</span><h2>People records <span className="count-pill">{filteredItems.length}</span></h2><p>Manage details and attached documents in one place.</p></div><button className="secondary-btn" onClick={() => { resetForm(); document.getElementById("form")?.scrollIntoView({ behavior: "smooth" }); }}>＋ Add record</button></div>
        {filteredItems.length === 0 ? <div className="empty-state"><div>⌕</div><h3>{query ? "No matching records" : "Your directory is ready"}</h3><p>{query ? "Try another name, ID number or phone number." : "Add your first record using the form above."}</p></div> : <div className="records-grid">{filteredItems.map((item) => <article className="person-card" key={item._id}><div className="person-card-head"><div className="person-avatar">{item.userImageUrl ? <img src={item.userImageUrl} alt=""/> : <span>{(item.name || "?").trim().charAt(0).toUpperCase()}</span>}</div><div className="person-title"><h3>{item.name}</h3><span className="record-id">ID · {item.idNo || "Not provided"}</span></div><span className="secure-chip">● Private</span></div><div className="person-meta"><div><span>PHONE</span><b>{item.phone || "—"}</b></div><div><span>DOCUMENTS</span><b>{IMAGE_FIELDS.filter((f) => item[f.url]).length} attached</b></div></div><div className="document-strip">{IMAGE_FIELDS.map((field) => <div className={`document-thumb ${item[field.url] ? "has-image" : ""}`} key={field.key} title={field.label}>{item[field.url] ? <img src={item[field.url]} alt={field.label}/> : <span>{field.icon}</span>}</div>)}</div><div className="person-actions"><button className="edit-action" onClick={() => startEdit(item)}>✎ Edit record</button><button className="delete-action" onClick={() => handleDelete(item)} disabled={loading}>Delete</button></div></article>)}</div>}
      </section><footer className="page-footer"><span>PEOPLEHUB <b>·</b> PRIVATE DIRECTORY</span><span>Store only documents you are authorized to manage.</span></footer>
    </main>{toast && <Toast toast={toast}/>}
  </div>;
}

function Toast({ toast }) { return <div className={`toast ${toast.type}`} role="status"><span>{toast.type === "success" ? "✓" : "!"}</span>{toast.message}</div>; }
