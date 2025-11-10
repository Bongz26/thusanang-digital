// src/hooks/useApplicationForm.js
import { useState } from "react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { supabase } from "../supabaseClient";

const MAX_DEPENDENTS = 5;

export default function useApplicationForm() {
  const [form, setForm] = useState({
    policyNo: "",
    plan: "",
    premium: "",
    title: "",
    surname: "",
    firstName: "",
    cellNo: "",
    idNumber: "",
    residentialAddress: "",
    status: "",
    sex: "",
    dependents: Array.from({ length: MAX_DEPENDENTS }).map(() => ({
      id: "",
      surname: "",
      name: "",
      relationship: "",
    })),
    beneficiaryName: "",
    beneficiaryId: "",
    capturer: "",
    checkedBy: "",
    qualifyingDate: "",
    files: {}, // e.g. { idCopy: {url, status}, proofOfAddress: {...} }
  });

  const [submitting, setSubmitting] = useState(false);

  // Basic form change handler
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // Dependents update
  const updateDependent = (index, key, value) => {
    setForm((prev) => {
      const deps = [...prev.dependents];
      deps[index][key] = value;
      return { ...prev, dependents: deps };
    });
  };

  // File upload validation + upload to Supabase
  const handleFileChange = async (e, key) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert("File too large. Max 10MB allowed.");
      return;
    }

    const validTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/jpg",
    ];
    if (!validTypes.includes(file.type)) {
      alert("Invalid file type. Only PDF, JPG, or PNG allowed.");
      return;
    }

    try {
      const policyKey =
        (form.policyNo || "UNASSIGNED").replace(/\s+/g, "_") || "TEMP";
      const ext = file.name.split(".").pop();
      const timestamp = Date.now();
      const path = `${policyKey}/${key}_${timestamp}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("policy_docs")
        .upload(path, file, {
          cacheControl: "3600",
          upsert: true,
          contentType: file.type,
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("policy_docs")
        .getPublicUrl(path);

      setForm((prev) => ({
        ...prev,
        files: {
          ...prev.files,
          [key]: {
            url: data.publicUrl,
            status: "uploaded",
            name: file.name,
            path,
          },
        },
      }));
    } catch (err) {
      alert("Upload failed: " + err.message);
    }
  };

  // Generate a simple PDF record
  const generatePDF = async (holderSigUrl, officeSigUrl) => {
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

    draw("THUSANANG FUNERAL SERVICES", 180, 40, 14);
    draw("APPLICATION FORM", 230, 60, 12);
    draw(`Policy No: ${form.policyNo}`, 40, 90);
    draw(`Plan: ${form.plan}`, 300, 90);
    draw(`Premium: R${form.premium}`, 450, 90);

    draw("Policy Holder Details:", 40, 120, 11);
    draw(
      `${form.title} ${form.firstName} ${form.surname}`,
      40,
      140
    );
    draw(`ID: ${form.idNumber}`, 300, 140);
    draw(`Cell: ${form.cellNo}`, 40, 160);
    draw(`Address: ${form.residentialAddress}`, 40, 180);
    draw(`Status: ${form.status} | Sex: ${form.sex}`, 40, 200);

    draw("Dependents:", 40, 230, 11);
    form.dependents.forEach((d, i) => {
      const y = 250 + i * 15;
      draw(
        `${i + 1}. ${d.id || "-"} | ${d.surname} ${d.name} | ${d.relationship}`,
        40,
        y
      );
    });

    draw("Beneficiary:", 40, 340, 11);
    draw(`${form.beneficiaryName} (${form.beneficiaryId})`, 120, 340);

    draw("Captured By:", 40, 360);
    draw(`${form.capturer}`, 130, 360);
    draw("Checked By:", 300, 360);
    draw(`${form.checkedBy}`, 370, 360);
    draw(`Qualifying Date: ${form.qualifyingDate}`, 40, 380);

    // Signatures
    const embedSignature = async (sigUrl, x, y) => {
      if (!sigUrl) return;
      const res = await fetch(sigUrl);
      const arr = await res.arrayBuffer();
      const png = await pdfDoc.embedPng(arr);
      page.drawImage(png, { x, y: height - y, width: 120, height: 40 });
    };
    await embedSignature(holderSigUrl, 40, 420);
    await embedSignature(officeSigUrl, 300, 420);

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: "application/pdf" });

    return blob;
  };

  // Main submit
  const handleSubmit = async (holderSigDataUrl, officeSigDataUrl) => {
    setSubmitting(true);
    try {
      // upload signatures first
      const uploadSig = async (dataUrl, type) => {
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        const policyKey =
          (form.policyNo || "UNASSIGNED").replace(/\s+/g, "_") || "TEMP";
        const path = `${policyKey}/${type}_sig_${Date.now()}.png`;

        const { error } = await supabase.storage
          .from("policy_docs")
          .upload(path, blob, {
            cacheControl: "3600",
            upsert: true,
            contentType: "image/png",
          });
        if (error) throw error;
        const { data } = supabase.storage
          .from("policy_docs")
          .getPublicUrl(path);
        return data.publicUrl;
      };

      const holderSigUrl = await uploadSig(holderSigDataUrl, "holder");
      const officeSigUrl = await uploadSig(officeSigDataUrl, "office");

      const pdfBlob = await generatePDF(holderSigUrl, officeSigUrl);

      // upload final PDF
      const pdfPath = `${form.policyNo || "UNASSIGNED"}/application_${Date.now()}.pdf`;
      const { error: uploadErr } = await supabase.storage
        .from("policy_docs")
        .upload(pdfPath, pdfBlob, {
          cacheControl: "3600",
          upsert: true,
          contentType: "application/pdf",
        });
      if (uploadErr) throw uploadErr;
      const { data: publicData } = supabase.storage
        .from("policy_docs")
        .getPublicUrl(pdfPath);

      // insert into Supabase table
      const record = {
        policy_no: form.policyNo,
        plan: form.plan,
        premium: form.premium,
        policyholder: {
          title: form.title,
          name: `${form.firstName} ${form.surname}`,
          id: form.idNumber,
          contact: form.cellNo,
          address: form.residentialAddress,
          status: form.status,
          sex: form.sex,
        },
        dependents: form.dependents,
        beneficiary: {
          name: form.beneficiaryName,
          id: form.beneficiaryId,
        },
        documents: form.files,
        pdf_url: publicData.publicUrl,
        created_at: new Date().toISOString(),
      };

      const { error: dbError } = await supabase
        .from("applications")
        .insert([record]);
      if (dbError) throw dbError;

      return { success: true };
    } catch (err) {
      return { success: false, error: err };
    } finally {
      setSubmitting(false);
    }
  };

  return {
    form,
    submitting,
    handleChange,
    updateDependent,
    handleFileChange,
    handleSubmit,
  };
}
