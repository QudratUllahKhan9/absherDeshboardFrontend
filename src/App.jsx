          </div>

          {loading ? (
            <div className="empty-state"><h3>Loading records…</h3><p>Connecting to the Absher database.</p></div>
          ) : filteredItems.length === 0 ? (
            <div className="empty-state">
              <div>⌕</div>
              <h3>{query ? "No matching records" : "Your directory is ready"}</h3>
              <p>
                {query
                  ? "Try another name, ID number or passport number."
                  : "Add your first record using the form above."}
              </p>
            </div>
          ) : (
            <div className="records-grid">
              {filteredItems.map((item) => {
                const attachedCount = IMAGE_FIELDS.filter(
                  (field) => item.images?.[field.key]
                ).length;

                return (
                  <article className="person-card" key={item.id}>
                    <div className="person-card-head">
                      <div className="person-avatar">
                        {item.images?.userImage ? (
                          <img src={item.images.userImage} alt={item.name} />
                        ) : (
                          <span>
                            {(item.name || "?").trim().charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>

                      <div className="person-title">
                        <h3>{item.name}</h3>
                        <span className="record-id">Iqama · {item.idNo}</span>
                      </div>

                      <span className="local-chip">● Local</span>
                    </div>

                    <div className="person-meta">
                      <div>
                        <span>PHONE & PASSWORD</span>
                        <b>{item.phone || "—"} / {item.password ? "••••" : "—"}</b>
                      </div>
                      <div>
                        <span>PASSPORT NO.</span>
                        <b>{item.passportNo || "—"}</b>
                      </div>
                    </div>

                    <div className="person-meta" style={{ marginTop: "8px" }}>
                      <div>
                        <span>IQAMA EXPIRY</span>
                        <b>{item.iqamaExpiryDate || "—"}</b>
                      </div>
                      <div>
                        <span>TRAVEL STATUS</span>
                        <b>{item.travelStatus || "—"}</b>
                      </div>
                    </div>

                    <div className="document-strip" style={{ marginTop: "15px" }}>
                      {IMAGE_FIELDS.map((field) => (
                        <div
                          className={`document-thumb ${
                            item.images?.[field.key] ? "has-image" : ""
                          }`}
                          key={field.key}
                          title={field.label}
                        >
                          {item.images?.[field.key] ? (
                            <img
                              src={item.images[field.key]}
                              alt={field.label}
                            />
                          ) : (
                            <span>{field.icon}</span>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="person-actions">
                      <button
                        className="edit-action"
                        type="button"
                        onClick={() => startEdit(item)}
                      >
                        ✎ Edit record
                      </button>

                      <button
                        className="delete-action"
                        type="button"
                        onClick={() => deleteRecord(item)}
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <footer className="page-footer">
          <span>PEOPLEHUB · FRONTEND EDITION</span>
          <span>Records are saved in this browser only.</span>
        </footer>
      </main>

      {toast && (
        <div className="toast" role="status">
          <span>✓</span>
          {toast}
        </div>
      )}
    </div>
  );
}
