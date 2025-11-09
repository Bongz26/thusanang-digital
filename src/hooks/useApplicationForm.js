import { useState } from 'react';
import { uploadFile, insertApplication } from '../utils/supabaseHelpers';
import { createApplicationPdf } from '../utils/pdfHelpers';

export default function useApplicationForm() {
  const [form, setForm] = useState({
    policyNo: '',
    plan: '',
    premium: '',
    title: '',
    status: '',
    sex: '',
    surname: '',
    firstName: '',
    cellNo: '',
    idNumber: '',
    residentialAddress: '',
    dependents: Array.from({ length: 5 }).map(() => ({ id: '', surname: '', name: '', relationship: '' })),
    beneficiaryName: '',
    beneficiaryId: '',
    capturer: '',
    checkedBy: '',
    qualifyingDate: '',
    documents: {} // will hold file URLs
  });
  const [submitting, setSubmitting] = useState(false);

  const updateDependent = (i, field, value) => {
    const updated = [...form.dependents];
    updated[i] = { ...updated[i], [field]: value };
    setForm({ ...form, dependents: updated });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleFileChange = async (e, key) => {
    const file = e.target.files[0];
    if (!file) return;
    const path = `applications/${form.policyNo || 'TEMP'}_${Date.now()}_${file.name}`;
    const publicUrl = await uploadFile('application_docs', path, file, { cacheControl: '3600', contentType: file.type });
    setForm({ ...form, documents: { ...form.documents, [key]: publicUrl } });
  };

  const handleSubmit = async (holderSigDataUrl, officeSigDataUrl) => {
    setSubmitting(true);
    try {
      const pdfBytes = await createApplicationPdf(form, holderSigDataUrl, officeSigDataUrl);
      const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
      const pdfPath = `applications/${form.policyNo}_${Date.now()}.pdf`;
      const pdfUrl = await uploadFile('application_pdfs', pdfPath, pdfBlob, { contentType: 'application/pdf' });

      const record = { ...form, holderSignatureUrl: holderSigDataUrl, officeSignatureUrl: officeSigDataUrl, pdfUrl };
      await insertApplication(record);

      return { success: true, pdfUrl };
    } catch (error) {
      console.error('Submit Error', error);
      return { success: false, error };
    } finally {
      setSubmitting(false);
    }
  };

  return {
    form,
    submitting,
    setForm,
    updateDependent,
    handleChange,
    handleFileChange,
    handleSubmit,
  };
}
