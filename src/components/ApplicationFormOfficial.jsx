import React, { useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import useApplicationForm from '../hooks/useApplicationForm';

export default function ApplicationFormOfficial() {
  const {
    form,
    submitting,
    handleChange,
    updateDependent,
    handleFileChange,
    handleSubmit
  } = useApplicationForm();

  const holderSigRef = useRef();
  const officeSigRef = useRef();

  const onSubmit = async (e) => {
    e.preventDefault();
    const holderSigDataUrl = holderSigRef.current.getTrimmedCanvas().toDataURL('image/png');
    const officeSigDataUrl = officeSigRef.current.getTrimmedCanvas().toDataURL('image/png');
    const result = await handleSubmit(holderSigDataUrl, officeSigDataUrl);
    if (result.success) {
      alert('Form submitted successfully! PDF downloaded.');
    } else {
      alert('Error submitting form: ' + result.error.message);
    }
  };

  return (
    <form onSubmit={onSubmit} className="p-6 bg-white rounded-lg shadow max-w-4xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold text-red-800 text-center mb-4">APPLICATION FORM</h1>

      {/* Plan + Premium */}
      <div className="grid grid-cols-2 gap-4">
        <input
          name="policyNo"
          value={form.policyNo}
          onChange={handleChange}
          placeholder="Policy No"
          className="input bg-gray-100"
          required
        />
        <input
          name="premium"
          value={form.premium}
          onChange={handleChange}
          placeholder="Monthly Premium (R)"
          className="input"
          required
        />
      </div>

      {/* Plan Selection */}
      <div>
        <p className="font-semibold mb-1">Benefits Added (Select One)</p>
        <div className="grid grid-cols-3 gap-2 text-sm">
          {['Silver','Gold','Platinum','Kgomo','Budget Buster','Catering','Tombstone','Black','Pearl','Ivory','After Tears'].map(plan => (
            <label key={plan} className="flex items-center">
              <input
                type="radio"
                name="plan"
                value={plan}
                checked={form.plan === plan}
                onChange={handleChange}
                className="mr-2"
                required
              />
              {plan}
            </label>
          ))}
        </div>
      </div>

      {/* Policy Holder Info */}
      <div>
        <p className="font-semibold">1. Details of Policy Holder</p>
        <div className="grid grid-cols-2 gap-4">
          <select
            name="title"
            value={form.title}
            onChange={handleChange}
            className="input"
            required
          >
            <option value="">Select Title</option>
            {['Mr', 'Mrs', 'Ms', 'Prof', 'Hon'].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <input
            name="surname"
            value={form.surname}
            onChange={handleChange}
            placeholder="Surname"
            className="input"
            required
          />
          <input
            name="firstName"
            value={form.firstName}
            onChange={handleChange}
            placeholder="First Name"
            className="input"
            required
          />
          <input
            name="cellNo"
            value={form.cellNo}
            onChange={handleChange}
            placeholder="Cell No"
            className="input"
            required
          />
          <input
            name="idNumber"
            value={form.idNumber}
            onChange={handleChange}
            placeholder="ID Number"
            className="input"
            required
          />
          <input
            name="residentialAddress"
            value={form.residentialAddress}
            onChange={handleChange}
            placeholder="Residential Address"
            classclassName="input"
            required
          />
        </div>

        <div className="flex flex-wrap gap-4 mt-2">
          <div>
            <p className="font-semibold">Status</p>
            {['Single', 'Married', 'Divorced', 'Widowed'].map(s => (
              <label key={s} className="block text-sm">
                <input type="radio" name="status" value={s} checked={form.status === s} onChange={handleChange} /> {s}
              </label>
            ))}
          </div>
          <div>
            <p className="font-semibold">Sex</p>
            {['Male', 'Female'].map(sex => (
              <label key={sex} className="block text-sm">
                <input type="radio" name="sex" value={sex} checked={form.sex === sex} onChange={handleChange} /> {sex}
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Dependents */}
      <div>
        <p className="font-semibold">2. Dependents (Max 5)</p>
        {form.dependents.map((dep, i) => (
          <div key={i} className="grid grid-cols-4 gap-2 mb-1 text-sm">
            <input
              placeholder="ID"
              className="input"
              value={dep.id}
              onChange={(e) => updateDependent(i, 'id', e.target.value)}
            />
            <input
              placeholder="Surname"
              className="input"
              value={dep.surname}
              onChange={(e) => updateDependent(i, 'surname', e.target.value)}
            />
            <input
              placeholder="Name"
              className="input"
              value={dep.name}
              onChange={(e) => updateDependent(i, 'name', e.target.value)}
            />
            <input
              placeholder="Relationship"
              className="input"
              value={dep.relationship}
              onChange={(e) => updateDependent(i, 'relationship', e.target.value)}
            />
          </div>
        ))}
      </div>

      {/* Nominated Beneficiary */}
      <div>
        <p className="font-semibold">3. Nominated Beneficiary</p>
        <div className="grid grid-cols-2 gap-4">
          <input
            name="beneficiaryName"
            value={form.beneficiaryName}
            onChange={handleChange}
            placeholder="Name"
            className="input"
            required
          />
          <input
            name="beneficiaryId"
            value={form.beneficiaryId}
            onChange={handleChange}
            placeholder="ID"
            className="input"
            required
          />
        </div>
      </div>

      {/* Supporting Documents */}
      <div>
        <p className="font-semibold">4. Supporting Documents</p>
        <div className="space-y-2">
          <label className="block text-sm">
            ID Copy:
            <input type="file" accept="image/*,application/pdf" onChange={(e) => handleFileChange(e, 'idCopy')} className="mt-1" />
          </label>
          <label className="block text-sm">
            Proof of Address:
            <input type="file" accept="image/*,application/pdf" onChange={(e) => handleFileChange(e, 'proofOfAddress')} className="mt-1" />
          </label>
          <label className="block text-sm">
            Beneficiary ID:
            <input type="file" accept="image/*,application/pdf" onChange={(e) => handleFileChange(e, 'beneficiaryIdDoc')} className="mt-1" />
          </label>
        </div>
      </div>

      {/* Signatures */}
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <p className="font-semibold">Policy Holder Signature</p>
          <SignatureCanvas ref={holderSigRef} canvasProps={{ className: 'border w-full h-24 bg-gray-50 rounded' }} />
          <button type="button" onClick={() => holderSigRef.current.clear()} className="text-sm text-red-500 mt-2">Clear</button>
        </div>
        <div>
          <p className="font-semibold">Office Use Signature</p>
          <SignatureCanvas ref={officeSigRef} canvasProps={{ className: 'border w-full h-24 bg-gray-50 rounded' }} />
          <button type="button" onClick={() => officeSigRef.current.clear()} className="text-sm text-red-500 mt-2">Clear</button>
        </div>
      </div>

      {/* Office Use */}
      <div>
        <p className="font-semibold">5. For Office Use Only</p>
        <div className="grid grid-cols-3 gap-4">
          <input
            name="capturer"
            value={form.capturer}
            onChange={handleChange}
            placeholder="Capturer (Name)"
            className="input"
            required
          />
          <input
            name="checkedBy"
            value={form.checkedBy}
            onChange={handleChange}
            placeholder="Checked By"
            className="input"
            required
          />
          <input
            name="qualifyingDate"
            value={form.qualifyingDate}
            type="date"
            onChange={handleChange}
            className="input"
            required
          />
        </div>
      </div>

      <button
        type="submit"
        className="btn-primary w-full bg-red-800 text-white py-3 rounded font-bold"
        disabled={submitting}
      >
        {submitting ? 'Submitting...' : 'Submit Form'}
      </button>
    </form>
  );
}
