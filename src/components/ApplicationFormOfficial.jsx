// src/components/ApplicationFormOfficial.jsx
import React, { useRef } from "react";
import SignatureCanvas from "react-signature-canvas";
import useApplicationForm from "../hooks/useApplicationForm";

export default function ApplicationFormOfficial() {
  const {
    form,
    submitting,
    handleChange,
    updateDependent,
    handleFileChange,
    handleSubmit,
  } = useApplicationForm();

  const holderSigRef = useRef();
  const officeSigRef = useRef();

  const onSubmit = async (e) => {
    e.preventDefault();
    const holderSigDataUrl = holderSigRef.current
      ?.getTrimmedCanvas()
      .toDataURL("image/png");
    const officeSigDataUrl = officeSigRef.current
      ?.getTrimmedCanvas()
      .toDataURL("image/png");
    const result = await handleSubmit(holderSigDataUrl, officeSigDataUrl);
    if (result.success) {
      alert("✅ Application submitted successfully!");
    } else {
      alert("❌ Error submitting form: " + result.error.message);
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      className="p-6 bg-white rounded-lg shadow max-w-4xl mx-auto space-y-6"
    >
      <h1 className="text-2xl font-bold text-red-800 text-center">
        APPLICATION FORM
      </h1>

      {/* Basic Info */}
      <div className="grid grid-cols-2 gap-4">
        <input
          name="policyNo"
          value={form.policyNo}
          onChange={handleChange}
          placeholder="Policy No"
          className="input border p-2 rounded"
          required
        />
        <input
          name="premium"
          value={form.premium}
          onChange={handleChange}
          placeholder="Monthly Premium (R)"
          className="input border p-2 rounded"
          required
        />
      </div>

      {/* Plan Selection */}
      <div>
        <p className="font-semibold mb-1">Benefits Added (Select One)</p>
        <div className="grid grid-cols-3 gap-2 text-sm">
          {[
            "Silver",
            "Gold",
            "Platinum",
            "Kgomo",
            "Budget Buster",
            "Catering",
            "Tombstone",
            "Black",
            "Pearl",
            "Ivory",
            "After Tears",
          ].map((plan) => (
            <label key={plan} className="flex items-center">
              <input
                type="radio"
                name="plan"
                value={plan}
                checked={form.plan === plan}
                onChange={handleChange}
                className="mr-2"
              />
              {plan}
            </label>
          ))}
        </div>
      </div>

      {/* Policyholder Info */}
      <div>
        <p className="font-semibold">1. Details of Policy Holder</p>
        <div className="grid grid-cols-2 gap-4">
          <select
            name="title"
            value={form.title}
            onChange={handleChange}
            className="input border p-2 rounded"
            required
          >
            <option value="">Title</option>
            {["Mr", "Mrs", "Ms", "Prof", "Hon"].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          <input
            name="surname"
            value={form.surname}
            onChange={handleChange}
            placeholder="Surname"
            className="input border p-2 rounded"
            required
          />
          <input
            name="firstName"
            value={form.firstName}
            onChange={handleChange}
            placeholder="First Name"
            className="input border p-2 rounded"
            required
          />
          <input
            name="cellNo"
            value={form.cellNo}
            onChange={handleChange}
            placeholder="Cell No"
            className="input border p-2 rounded"
            required
          />
          <input
            name="idNumber"
            value={form.idNumber}
            onChange={handleChange}
            placeholder="ID Number"
            className="input border p-2 rounded"
            required
          />
          <input
            name="residentialAddress"
            value={form.residentialAddress}
            onChange={handleChange}
            placeholder="Residential Address"
            className="input border p-2 rounded"
            required
          />
        </div>
      </div>

      {/* Supporting Documents */}
      <div>
        <p className="font-semibold mb-2">Supporting Documents</p>
        {[
          { key: "idCopy", label: "ID Copy" },
          { key: "proofOfAddress", label: "Proof of Address" },
          { key: "beneficiaryIdDoc", label: "Beneficiary ID" },
        ].map(({ key, label }) => (
          <div key={key} className="mb-2 text-sm">
            <label>{label}:</label>
            <input
              type="file"
              accept=".pdf,image/*"
              onChange={(e) => handleFileChange(e, key)}
              className="block mt-1"
            />
            {form.files[key] && (
              <div className="text-xs mt-1">
                ✅ Uploaded:{" "}
                <a
                  href={form.files[key].url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 underline"
                >
                  {form.files[key].name}
                </a>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Dependents */}
      <div>
        <p className="font-semibold mb-1">2. Dependents (Max 5)</p>
        {form.dependents.map((dep, i) => (
          <div key={i} className="grid grid-cols-4 gap-2 mb-1 text-sm">
            <input
              placeholder="ID"
              className="input border p-1 rounded"
              value={dep.id}
              onChange={(e) => updateDependent(i, "id", e.target.value)}
            />
            <input
              placeholder="Surname"
              className="input border p-1 rounded"
              value={dep.surname}
              onChange={(e) => updateDependent(i, "surname", e.target.value)}
            />
            <input
              placeholder="Name"
              className="input border p-1 rounded"
              value={dep.name}
              onChange={(e) => updateDependent(i, "name", e.target.value)}
            />
            <input
              placeholder="Relationship"
              className="input border p-1 rounded"
              value={dep.relationship}
              onChange={(e) =>
                updateDependent(i, "relationship", e.target.value)
              }
            />
          </div>
        ))}
      </div>

      {/* Signatures */}
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <p className="font-semibold">Policy Holder Signature</p>
          <SignatureCanvas
            ref={holderSigRef}
            canvasProps={{ className: "border w-full h-28 bg-gray-50" }}
          />
        </div>
        <div>
          <p className="font-semibold">Office Use Signature</p>
          <SignatureCanvas
            ref={officeSigRef}
            canvasProps={{ className: "border w-full h-28 bg-gray-50" }}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-red-700 text-white py-3 rounded font-bold hover:bg-red-800"
      >
        {submitting ? "Submitting..." : "Submit Application"}
      </button>
    </form>
  );
}
