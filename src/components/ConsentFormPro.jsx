import React, { useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { supabase } from "../supabaseClient";

/**
 * ConsentFormPro.jsx
 * - Drop into src/components/
 * - Use in App.jsx: import ConsentFormPro from './components/ConsentFormPro.jsx'
 *
 * Notes:
 * - Requires pdf-lib & react-signature-canvas
 * - Requires Supabase storage bucket 'consent_docs' (public) and table 'consents'
 */

const MAX_DEPENDENTS = 5;
const DOC_TYPES = ["ID Copy", "Proof of Payment", "Policy Certificate", "Other"];

function bytesToDataURL(bytes, mime = "application/octet-stream") {
  const blob = new Blob([bytes], { type: mime });
  return URL.createObjectURL(blob);
}

export default function ConsentFormPro() {
  // POLICYHOLDER & FORM STATE
  const [form, setForm] = useState({
    policyNumber: "",
    name: "",
    contact: "",
    idNumber: "",
    address: "",
    consentChecked: false,
    dependents: Array.from({ length: MAX_DEPENDENTS }).map(() => ({
      name: "",
      relationship: "",
      idNumber: "",
      documentType: "ID Copy",
      uploadStatus: "empty", // empty | uploading | uploaded | pending_verification | verified | rejected
      filePath: null, // storage path
      fileUrl: null, // public url
      uploadedAt: null,
    })),
  });

  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState({ open: false, message: "", pdfUrl: null });
  const [policyholderUploads, setPolicyholderUploads] = useState([]); // array of {name,url,path}

  // signature refs
  const holderSigRef = useRef();
  const adminSigRef = useRef();

  // helper: update top-level form fields
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === "checkbox") {
      setForm((s) => ({ ...s, [name]: checked }));
    } else {
      setForm((s) => ({ ...s, [name]: value }));
    }
  };

  // helper: update dependent specific fields
  const updateDependent = (idx, key, value) => {
    setForm((s) => {
      const dependents = [...s.dependents];
      dependents[idx] = { ...dependents[idx], [key]: value };
      return { ...s, dependents };
    });
  };

  // file upload helper for a dependent
  const handleDependentFileSelect = async (idx, file) => {
    if (!file) return;
    // set uploading
    updateDependent(idx, "uploadStatus", "uploading");
    try {
      // build a path: consent_docs/{policyNumber_or_temp}/{timestamp}_{dependentIdNumber or name}.{ext}
      const policyKey = (form.policyNumber || "UNASSIGNED").replace(/\s+/g, "_");
      const ext = file.name.split(".").pop();
      const safeName = (form.dependents[idx].idNumber || form.dependents[idx].name || `dep${idx + 1}`).replace(/\s+/g, "_");
      const timestamp = Date.now();
      const path = `${policyKey}/${safeName}_${timestamp}.${ext}`;

      const { data, error: uploadErr } = await supabase.storage.from("consent_docs").upload(path, file, {
        cacheControl: "3600",
        upsert: true,
        contentType: file.type,
      });

      if (uploadErr) throw uploadErr;

      // get public URL
      const { data: publicData } = supabase.storage.from("consent_docs").getPublicUrl(path);
      const publicUrl = publicData?.publicUrl || null;

      updateDependent(idx, "filePath", path);
      updateDependent(idx, "fileUrl", publicUrl);
      updateDependent(idx, "uploadStatus", "uploaded");
      updateDependent(idx, "uploadedAt", new Date().toISOString());
    } catch (err) {
      console.error("Upload error", err);
      updateDependent(idx, "uploadStatus", "empty");
      alert("Failed to upload file: " + (err.message || err));
    }
  };

  // file upload for policyholder (one-off or multiple)
  const handlePolicyholderFile = async (file) => {
    if (!file) return;
    try {
      const policyKey = (form.policyNumber || "UNASSIGNED").replace(/\s+/g, "_");
      const ext = file.name.split(".").pop();
      const timestamp = Date.now();
      const path = `${policyKey}/policyholder_${timestamp}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("consent_docs").upload(path, file, {
        cacheControl: "3600",
        upsert: true,
        contentType: file.type,
      });
      if (uploadErr) throw uploadErr;
      const { data: publicData } = supabase.storage.from("consent_docs").getPublicUrl(path);
      const publicUrl = publicData?.publicUrl || null;
      setPolicyholderUploads((s) => [...s, { name: file.name, url: publicUrl, path }]);
    } catch (err) {
      console.error(err);
      alert("Failed to upload policyholder file: " + (err.message || err));
    }
  };

  // allow removal of uploaded policyholder file (optional)
  const removePolicyholderUpload = (path) => {
    setPolicyholderUploads((s) => s.filter((p) => p.path !== path));
    // optionally: supabase.storage.from('consent_docs').remove([path])
  };

  // simple preview helper for external url or stored path
  const openPreview = (url) => {
    if (!url) return alert("No preview available");
    window.open(url, "_blank");
  };

  // generate PDF and upload it to Supabase, return public url
  const generateAndUploadPDF = async (savedRecordId, data, holderSigUrl, adminSigUrl) => {
    try {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595, 842]);
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const { height } = page.getSize();

      const draw = (text, x, y, size = 10) =>
        page.drawText(text || "", { x, y: height - y, size, font, color: rgb(0, 0, 0) });

      // Header
      draw("THUSANANG FUNERAL SERVICES", 170, 40, 14);
      draw("POLICYHOLDER CONSENT FORM", 200, 60, 12);
      draw(`Policy Number: ${data.policyNumber || ""}`, 40, 90);

      // Policyholder details
      draw("Policyholder:", 40, 120, 11);
      draw(`Name: ${data.name || ""}`, 40, 140);
      draw(`Contact: ${data.contact || ""}`, 300, 140);
      draw(`ID Number: ${data.idNumber || ""}`, 40, 160);
      draw(`Address: ${data.address || ""}`, 40, 180);

      // Dependents brief list
      draw("Dependents:", 40, 210, 11);
      (data.dependents || []).forEach((d, i) => {
        const y = 230 + i * 18;
        draw(`${i + 1}. ${d.name || "-"} | ${d.relationship || "-"} | ${d.idNumber || "-"}`, 40, y, 10);
      });

      // signatures if available
      const embedSignature = async (sigUrl, x, y) => {
        try {
          if (!sigUrl) return;
          // fetch image from url, convert to array buffer
          const res = await fetch(sigUrl);
          const arr = await res.arrayBuffer();
          const pngImg = await pdfDoc.embedPng(arr);
          page.drawImage(pngImg, { x, y: height - y, width: 140, height: 40 });
        } catch (err) {
          console.warn("Failed to embed signature", err);
        }
      };

      await embedSignature(holderSigUrl, 40, 350);
      draw("Policyholder Signature", 40, 405);
      await embedSignature(adminSigUrl, 300, 350);
      draw("Admin Signature", 300, 405);

      // minimal footer
      draw("RESPECTFUL | PROFESSIONAL | DIGNIFIED", 170, 780, 9);

      const pdfBytes = await pdfDoc.save();
      const pdfBlob = new Blob([pdfBytes], { type: "application/pdf" });

      // upload to Supabase
      const policyKey = (data.policyNumber || "UNASSIGNED").replace(/\s+/g, "_");
      const pdfPath = `${policyKey}/consent_${savedRecordId || Date.now()}.pdf`;
      const { error: uploadErr } = await supabase.storage.from("consent_docs").upload(pdfPath, pdfBlob, {
        cacheControl: "3600",
        upsert: true,
        contentType: "application/pdf",
      });
      if (uploadErr) throw uploadErr;
      const { data: publicData } = supabase.storage.from("consent_docs").getPublicUrl(pdfPath);
      return { publicUrl: publicData?.publicUrl || null, path: pdfPath };
    } catch (err) {
      console.error("PDF generation/upload error", err);
      return null;
    }
  };

  // main submit flow
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.consentChecked) return alert("Please confirm the consent checkbox.");
    if (!form.name || !form.policyNumber) return alert("Please enter policyholder name and policy number.");

    setSaving(true);

    try {
      // capture signatures
      const holderSigDataUrl = holderSigRef.current?.getTrimmedCanvas().toDataURL("image/png") || null;
      const adminSigDataUrl = adminSigRef.current?.getTrimmedCanvas().toDataURL("image/png") || null;

      // optional: upload signatures to storage (so they have public urls)
      const uploadSignature = async (dataUrl, filenameSuffix) => {
        if (!dataUrl) return null;
        // convert dataURL to blob
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        const policyKey = (form.policyNumber || "UNASSIGNED").replace(/\s+/g, "_");
        const path = `${policyKey}/signature_${filenameSuffix}_${Date.now()}.png`;
        const { error: uploadErr } = await supabase.storage.from("consent_docs").upload(path, blob, {
          cacheControl: "3600",
          upsert: true,
          contentType: "image/png",
        });
        if (uploadErr) throw uploadErr;
        const { data: publicData } = supabase.storage.from("consent_docs").getPublicUrl(path);
        return { path, url: publicData?.publicUrl || null };
      };

      const holderSig = await uploadSignature(holderSigDataUrl, "policyholder");
      const adminSig = await uploadSignature(adminSigDataUrl, "admin");

      // prepare db record
      const record = {
        policy_number: form.policyNumber,
        name: form.name,
        contact: form.contact,
        id_number: form.idNumber,
        address: form.address,
        dependents: form.dependents,
        document_urls: {
          policyholder_files: policyholderUploads,
        },
        consent_signature_url: holderSig?.url || null,
        admin_signature_url: adminSig?.url || null,
      };

      // insert into supabase table
      const { data: inserted, error: insertErr } = await supabase.from("consents").insert([record]).select().single();
      if (insertErr) throw insertErr;

      // generate the PDF and upload it
      const pdfResult = await generateAndUploadPDF(inserted.id, form, holderSig?.url, adminSig?.url);
      if (pdfResult && pdfResult.publicUrl) {
        // update the record with pdf url
        await supabase.from("consents").update({ pdf_url: pdfResult.publicUrl }).eq("id", inserted.id);
      }

      setModal({ open: true, message: "Consent submitted successfully.", pdfUrl: pdfResult?.publicUrl || null });
    } catch (err) {
      console.error("Save error", err);
      alert("Failed to submit consent: " + (err.message || err));
    } finally {
      setSaving(false);
    }
  };

  // small placeholder for a future verification dashboard (UI-only)
  const VerificationDashboard = () => {
    return (
      <div className="mt-6 p-4 border rounded bg-gray-50">
        <h3 className="font-semibold">Verification Dashboard (placeholder)</h3>
        <p className="text-sm text-gray-600">
          This area will show uploaded documents that are pending verification. Admins will be able to view, verify, or reject documents and leave comments.
        </p>
        <div className="mt-3 grid gap-2">
          {form.dependents.filter((d) => d.uploadStatus !== "empty").length === 0 ? (
            <div className="text-sm text-gray-500">No dependent uploads yet.</div>
          ) : (
            form.dependents.map((d, i) => {
              if (!d.fileUrl) return null;
              return (
                <div key={i} className="flex items-center justify-between gap-2 bg-white p-2 rounded shadow-sm">
                  <div>
                    <div className="font-medium">{d.name || `Dependent ${i + 1}`}</div>
                    <div className="text-xs text-gray-600">{d.documentType} • {d.uploadStatus}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => openPreview(d.fileUrl)} className="text-sm text-blue-600 underline">Preview</button>
                    <span className={`text-xs px-2 py-1 rounded ${d.uploadStatus === "uploaded" ? "bg-yellow-100 text-yellow-700" : ""} ${d.uploadStatus === "verified" ? "bg-green-100 text-green-700" : ""}`}>
                      {d.uploadStatus}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="bg-white rounded shadow p-6 space-y-6">
        <header className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-red-700">POLICYHOLDER CONSENT FORM</h1>
            <div className="text-sm text-gray-600">Thusanang Funeral Services (Reg no 2006/122746/23) — FSP39701</div>
          </div>
          <div className="text-right text-xs text-gray-500">
            <div>Head Office Phuthaditjhaba</div>
            <div>Tel: 058 713 0112</div>
            <div>WhatsApp: 071 480 5050 / 073 073 1580</div>
          </div>
        </header>

        {/* Disclosure card */}
        <div className="border rounded p-4 bg-gray-50 max-h-44 overflow-auto text-sm text-gray-700">
          {/* Put the full consent text here; trimmed for brevity */}
          <p className="mb-2">
            Thusanang Funeral Services (FSP39701) has entered into a partnership with Sanlam Developing Markets... (full disclosure text included).
          </p>
          <p className="text-sm text-gray-600">
            By checking the consent box you confirm that you have read and accept the terms; the new policy will be underwritten by Sanlam Developing Markets (FSP 11230) and the terms remain unchanged.
          </p>
        </div>

        {/* Consent checkbox */}
        <label className="flex items-center gap-3">
          <input type="checkbox" name="consentChecked" checked={form.consentChecked} onChange={handleChange} />
          <span className="text-sm">I confirm that I have read and understood the terms of this consent form.</span>
        </label>

        {/* Policyholder details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input name="policyNumber" value={form.policyNumber} onChange={handleChange} placeholder="Policy Number" className="input" />
          <input name="name" value={form.name} onChange={handleChange} placeholder="Policyholder Name" className="input" />
          <input name="contact" value={form.contact} onChange={handleChange} placeholder="Contact Number" className="input" />
          <input name="idNumber" value={form.idNumber} onChange={handleChange} placeholder="ID Number" className="input" />
          <input name="address" value={form.address} onChange={handleChange} placeholder="Address" className="input col-span-2" />
        </div>

        {/* Policyholder file uploads */}
        <div className="space-y-2">
          <label className="font-semibold text-sm">Supporting Documents (Policyholder)</label>
          <div className="flex gap-2 items-center">
            <input
              id="policyholder-file"
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              onChange={(e) => handlePolicyholderFile(e.target.files[0])}
              className="hidden"
            />
            <label htmlFor="policyholder-file" className="py-2 px-4 bg-white border rounded cursor-pointer text-sm">Choose file or drag here</label>
            <div className="flex gap-2">
              {policyholderUploads.map((u) => (
                <div key={u.path} className="flex items-center gap-2 bg-gray-100 p-2 rounded">
                  <div className="text-xs font-medium">{u.name}</div>
                  <button onClick={() => openPreview(u.url)} className="text-xs text-blue-600 underline">Preview</button>
                  <button onClick={() => removePolicyholderUpload(u.path)} className="text-xs text-red-600">Remove</button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Dependents table */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">Dependents (Max {MAX_DEPENDENTS})</h3>
            <div className="text-sm text-gray-500">Upload each dependent's ID/Supporting doc</div>
          </div>

          <div className="space-y-2">
            {form.dependents.map((d, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center bg-white p-3 rounded shadow-sm">
                <div className="col-span-3">
                  <input value={d.name} onChange={(e) => updateDependent(i, "name", e.target.value)} placeholder="Full name" className="input text-sm" />
                </div>
                <div className="col-span-2">
                  <input value={d.relationship} onChange={(e) => updateDependent(i, "relationship", e.target.value)} placeholder="Relationship" className="input text-sm" />
                </div>
                <div className="col-span-2">
                  <input value={d.idNumber} onChange={(e) => updateDependent(i, "idNumber", e.target.value)} placeholder="ID number" className="input text-sm" />
                </div>
                <div className="col-span-2">
                  <select value={d.documentType} onChange={(e) => updateDependent(i, "documentType", e.target.value)} className="input text-sm">
                    {DOC_TYPES.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>

                <div className="col-span-3 flex items-center gap-2 justify-end">
                  <input
                    id={`dep-file-${i}`}
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf"
                    className="hidden"
                    onChange={(e) => handleDependentFileSelect(i, e.target.files[0])}
                  />
                  <label htmlFor={`dep-file-${i}`} className="text-sm py-2 px-3 border rounded cursor-pointer">Upload</label>

                  <div className="text-right">
                    <div className="text-xs">{d.uploadStatus === "empty" ? "No file" : d.uploadStatus}</div>
                    {d.fileUrl && <button onClick={() => openPreview(d.fileUrl)} className="text-xs text-blue-600 underline">Preview</button>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Signatures */}
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <p className="font-semibold">Policyholder Signature</p>
            <div className="border rounded p-2 bg-gray-50">
              <SignatureCanvas ref={holderSigRef} canvasProps={{ className: "w-full h-32" }} />
              <div className="flex gap-2 mt-2">
                <button type="button" onClick={() => holderSigRef.current.clear()} className="text-sm text-red-600">Clear</button>
              </div>
            </div>
          </div>

          <div>
            <p className="font-semibold">Admin Signature (optional)</p>
            <div className="border rounded p-2 bg-gray-50">
              <SignatureCanvas ref={adminSigRef} canvasProps={{ className: "w-full h-32" }} />
              <div className="flex gap-2 mt-2">
                <button type="button" onClick={() => adminSigRef.current.clear()} className="text-sm text-red-600">Clear</button>
              </div>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center gap-4">
          <button onClick={handleSubmit} disabled={saving} className="btn-primary bg-red-700 text-white py-2 px-4 rounded">
            {saving ? "Saving..." : "Submit"}

      </button>
    </form>
  )
}
