import React, { useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { supabase } from "../supabaseClient";

export default function ConsentFormPro() {
  const [form, setForm] = useState({
    policyNumber: "",
    name: "",
    contact: "",
    idNumber: "",
    address: "",
    consentChecked: false,
  });
  const [saving, setSaving] = useState(false);
  const [successUrl, setSuccessUrl] = useState(null);

  const holderSigRef = useRef();
  const adminSigRef = useRef();

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((s) => ({ ...s, [name]: type === "checkbox" ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.consentChecked) return alert("Please confirm the consent checkbox first.");
    setSaving(true);

    try {
      const holderSig = holderSigRef.current
        ?.getTrimmedCanvas()
        .toDataURL("image/png");
      const adminSig = adminSigRef.current
        ?.getTrimmedCanvas()
        .toDataURL("image/png");

      // create PDF
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595, 842]);
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const { height } = page.getSize();
      const draw = (text, x, y, size = 10) =>
        page.drawText(text || "", {
          x,
          y: height - y,
          size,
          font,
          color: rgb(0, 0, 0),
        });

      draw("POLICYHOLDER CONSENT FORM", 180, 40, 14);
      draw("Thusanang Funeral Services (FSP 39701)", 180, 60, 10);
      draw(`Policy No: ${form.policyNumber}`, 40, 100);
      draw(`Name: ${form.name}`, 40, 120);
      draw(`Contact: ${form.contact}`, 40, 140);
      draw(`ID: ${form.idNumber}`, 40, 160);
      draw(`Address: ${form.address}`, 40, 180);

      // signatures
      const embedSignature = async (sigUrl, x, y) => {
        if (!sigUrl) return;
        const res = await fetch(sigUrl);
        const arr = await res.arrayBuffer();
        const png = await pdfDoc.embedPng(arr);
        page.drawImage(png, { x, y: height - y, width: 120, height: 40 });
      };

      const holderBlob = await fetch(holderSig).then((r) => r.blob());
      const adminBlob = await fetch(adminSig).then((r) => r.blob());

      const pdfBytes = await pdfDoc.save();
      const pdfBlob = new Blob([pdfBytes], { type: "application/pdf" });

      const path = `${form.policyNumber || "UNASSIGNED"}/consent_${Date.now()}.pdf`;
      const { error: uploadErr } = await supabase.storage
        .from("consent_docs")
        .upload(path, pdfBlob, {
          cacheControl: "3600",
          upsert: true,
          contentType: "application/pdf",
        });
      if (uploadErr) throw uploadErr;

      const { data: publicData } = supabase.storage
        .from("consent_docs")
        .getPublicUrl(path);
      setSuccessUrl(publicData.publicUrl);
    } catch (err) {
      console.error(err);
      alert("Failed to submit consent: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white shadow rounded">
      <h2 className="text-2xl font-bold text-red-700 mb-4 text-center">
        POLICYHOLDER CONSENT FORM
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          name="policyNumber"
          placeholder="Policy Number"
          value={form.policyNumber}
          onChange={handleChange}
          className="input"
        />
        <input
          name="name"
          placeholder="Full Name"
          value={form.name}
          onChange={handleChange}
          className="input"
        />
        <input
          name="contact"
          placeholder="Contact Number"
          value={form.contact}
          onChange={handleChange}
          className="input"
        />
        <input
          name="idNumber"
          placeholder="ID Number"
          value={form.idNumber}
          onChange={handleChange}
          className="input"
        />
        <input
          name="address"
          placeholder="Address"
          value={form.address}
          onChange={handleChange}
          className="input"
        />

        <label className="flex gap-2 items-center">
          <input
            type="checkbox"
            name="consentChecked"
            checked={form.consentChecked}
            onChange={handleChange}
          />
          <span>I have read and understood the consent terms.</span>
        </label>

        <div className="grid md:grid-cols-2 gap-6 mt-4">
          <div>
            <p className="font-semibold">Policyholder Signature</p>
            <SignatureCanvas
              ref={holderSigRef}
              canvasProps={{ className: "border w-full h-28 bg-gray-50" }}
            />
          </div>
          <div>
            <p className="font-semibold">Admin Signature</p>
            <SignatureCanvas
              ref={adminSigRef}
              canvasProps={{ className: "border w-full h-28 bg-gray-50" }}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="btn-primary w-full"
        >
          {saving ? "Submitting..." : "Submit Consent"}
        </button>

        {successUrl && (
          <div className="mt-4 text-center">
            ✅ Consent saved!{" "}
            <a
              href={successUrl}
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 underline"
            >
              View PDF
            </a>
          </div>
        )}
      </form>
    </div>
  );
}
