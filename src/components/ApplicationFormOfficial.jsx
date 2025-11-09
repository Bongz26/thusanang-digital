import React, { useState, useRef } from 'react'
import SignatureCanvas from 'react-signature-canvas'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { supabase } from '../supabaseClient'

export default function ApplicationFormOfficial() {
  const [form, setForm] = useState({
    policyNo: 'THULOOA',
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
    dependents: Array(5).fill({ id: '', surname: '', name: '', relationship: '' }),
    beneficiaryName: '',
    beneficiaryId: '',
    capturer: '',
    checkedBy: '',
    qualifyingDate: '',
  })

  const holderSigRef = useRef()
  const officeSigRef = useRef()

  const updateDependent = (i, field, value) => {
    const updated = [...form.dependents]
    updated[i] = { ...updated[i], [field]: value }
    setForm({ ...form, dependents: updated })
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm({ ...form, [name]: value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const holderSig = holderSigRef.current.getTrimmedCanvas().toDataURL('image/png')
    const officeSig = officeSigRef.current.getTrimmedCanvas().toDataURL('image/png')

    const dataToSave = { ...form, holderSig, officeSig }

    const { error } = await supabase.from('applications').insert([dataToSave])
    if (error) return alert('Error saving form: ' + error.message)

    await generatePDF(form, holderSig, officeSig)
    generateCSV(form)
    alert('Form submitted successfully!')
  }

  const generateCSV = (data) => {
    const csv = `Policy No,Title,Surname,First Name,Status,Sex,ID Number,Cell No,Address,Beneficiary,Plan,Premium
${data.policyNo},${data.title},${data.surname},${data.firstName},${data.status},${data.sex},${data.idNumber},${data.cellNo},${data.residentialAddress},${data.beneficiaryName},${data.plan},${data.premium}`
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'Policy24_Import.csv'
    a.click()
  }

  const generatePDF = async (data, holderSig, officeSig) => {
    const pdfDoc = await PDFDocument.create()
    const page = pdfDoc.addPage([595, 842])
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const { height } = page.getSize()
    const drawText = (text, x, y, size = 10) =>
      page.drawText(text || '', { x, y: height - y, size, font, color: rgb(0, 0, 0) })

    // Header
    //drawText('THUSANANG FUNERAL SERVICES', 180, 40, 14)
    drawText('APPLICATION FORM', 230, 60, 12)
    drawText(`POLICY NO: ${data.policyNo}`, 40, 90, 10)

    // Plan and Premium
    drawText(`PLAN: ${data.plan}`, 300, 90, 10)
    drawText(`MONTHLY PREMIUM: R ${data.premium}`, 450, 90, 10)

    // Policy Holder
    drawText('1. DETAILS OF POLICY HOLDER', 40, 120, 10)
    drawText(`Title: ${data.title}`, 40, 140)
    drawText(`Status: ${data.status}`, 150, 140)
    drawText(`Sex: ${data.sex}`, 280, 140)
    drawText(`Surname: ${data.surname}`, 40, 160)
    drawText(`First Name: ${data.firstName}`, 280, 160)
    drawText(`Cell No: ${data.cellNo}`, 40, 180)
    drawText(`ID Number: ${data.idNumber}`, 280, 180)
    drawText(`Address: ${data.residentialAddress}`, 40, 200)

    // Dependents
    drawText('2. DEPENDENTS', 40, 230, 10)
    data.dependents.forEach((d, i) => {
      const y = 250 + i * 20
      drawText(`${i + 1}. ${d.id} ${d.surname} ${d.name} ${d.relationship}`, 60, y)
    })

    // Beneficiary
    drawText('3. NOMINATED BENEFICIARY', 40, 370, 10)
    drawText(`Name: ${data.beneficiaryName}`, 60, 390)
    drawText(`ID: ${data.beneficiaryId}`, 300, 390)

    // Office Use
    drawText('4. FOR OFFICE USE ONLY', 40, 420, 10)
    drawText(`Capturer: ${data.capturer}`, 60, 440)
    drawText(`Checked By: ${data.checkedBy}`, 250, 440)
    drawText(`Qualifying Date: ${data.qualifyingDate}`, 420, 440)

    // Footer
    drawText('RESPECTFUL | PROFESSIONAL | DIGNIFIED', 170, 800, 10)
    drawText('Head Office Phuthaditjhaba - Tel: 058 713 0112 - Cell/WhatsApp: 071 480 5050 / 073 073 1580', 40, 815, 8)
    drawText('Email: thusanangfunerals@gmail.com | www.thusanangfs.co.za | FSP 39701', 120, 830, 8)

    // Embed signatures
    const holderImg = await pdfDoc.embedPng(holderSig)
    const officeImg = await pdfDoc.embedPng(officeSig)
    page.drawImage(holderImg, { x: 40, y: height - 480, width: 120, height: 40 })
    page.drawImage(officeImg, { x: 240, y: height - 480, width: 120, height: 40 })
    drawText('Policy Holder Signature', 40, 500)
    drawText('Office Signature', 240, 500)

    const pdfBytes = await pdfDoc.save()
    const blob = new Blob([pdfBytes], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Application_${data.surname}.pdf`
    a.click()
  }

  return (
    <form onSubmit={handleSubmit} className="p-6 bg-white rounded-lg shadow max-w-4xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold text-red-800 text-center mb-4">APPLICATION FORM</h1>

      {/* Plan + Premium */}
      <div className="grid grid-cols-2 gap-4">
        <input name="policyNo" value={form.policyNo} readOnly className="input bg-gray-100" />
        <input name="premium" value={form.premium} onChange={handleChange} placeholder="Monthly Premium (R)" className="input" />
      </div>

      {/* Plan Selection */}
      <div>
        <p className="font-semibold mb-1">Benefits Added (Select One)</p>
        <div className="grid grid-cols-3 gap-2 text-sm">
          {['Silver','Gold','Platinum','Kgomo','Budget Buster','Catering','Tombstone','Black','Pearl','Ivory','After Tears'].map(plan => (
            <label key={plan} className="flex items-center">
              <input type="radio" name="plan" value={plan} onChange={handleChange} checked={form.plan === plan} className="mr-2" />
              {plan}
            </label>
          ))}
        </div>
      </div>

      {/* Policy Holder Info */}
      <div>
        <p className="font-semibold">1. Details of Policy Holder</p>
        <div className="grid grid-cols-2 gap-4">
          <select name="title" onChange={handleChange} className="input">
            <option value="">Select Title</option>
            {['Mr', 'Mrs', 'Ms', 'Prof', 'Hon'].map(t => <option key={t}>{t}</option>)}
          </select>
          <input name="surname" onChange={handleChange} placeholder="Surname" className="input" />
          <input name="firstName" onChange={handleChange} placeholder="First Name" className="input" />
          <input name="cellNo" onChange={handleChange} placeholder="Cell No" className="input" />
          <input name="idNumber" onChange={handleChange} placeholder="ID Number" className="input" />
          <input name="residentialAddress" onChange={handleChange} placeholder="Residential Address" className="input" />
        </div>

        <div className="flex flex-wrap gap-4 mt-2">
          <div>
            <p className="font-semibold">Status</p>
            {['Single', 'Married', 'Divorced', 'Widowed'].map(s => (
              <label key={s} className="block text-sm"><input type="radio" name="status" value={s} onChange={handleChange} /> {s}</label>
            ))}
          </div>
          <div>
            <p className="font-semibold">Sex</p>
            {['Male', 'Female'].map(sex => (
              <label key={sex} className="block text-sm"><input type="radio" name="sex" value={sex} onChange={handleChange} /> {sex}</label>
            ))}
          </div>
        </div>
      </div>

      {/* Dependents */}
      <div>
        <p className="font-semibold">2. Dependents (Max 5)</p>
        {form.dependents.map((dep, i) => (
          <div key={i} className="grid grid-cols-4 gap-2 mb-1 text-sm">
            <input placeholder="ID" className="input" onChange={(e) => updateDependent(i, 'id', e.target.value)} />
            <input placeholder="Surname" className="input" onChange={(e) => updateDependent(i, 'surname', e.target.value)} />
            <input placeholder="Name" className="input" onChange={(e) => updateDependent(i, 'name', e.target.value)} />
            <input placeholder="Relationship" className="input" onChange={(e) => updateDependent(i, 'relationship', e.target.value)} />
          </div>
        ))}
      </div>

      {/* Beneficiary */}
      <div>
        <p className="font-semibold">3. Nominated Beneficiary</p>
        <div className="grid grid-cols-2 gap-4">
          <input name="beneficiaryName" onChange={handleChange} placeholder="Name" className="input" />
          <input name="beneficiaryId" onChange={handleChange} placeholder="ID" className="input" />
        </div>
      </div>

      {/* Signatures */}
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <p className="font-semibold">Policy Holder Signature</p>
          <SignatureCanvas ref={holderSigRef} canvasProps={{ className: 'border w-full h-24 bg-gray-50 rounded' }} />
          <button type="button" onClick={() => holderSigRef.current.clear()} className="text-sm text-red-500">Clear</button>
        </div>
        <div>
          <p className="font-semibold">Office Use Signature</p>
          <SignatureCanvas ref={officeSigRef} canvasProps={{ className: 'border w-full h-24 bg-gray-50 rounded' }} />
          <button type="button" onClick={() => officeSigRef.current.clear()} className="text-sm text-red-500">Clear</button>
        </div>
      </div>

      {/* Office Use */}
      <div>
        <p className="font-semibold">4. For Office Use Only</p>
        <div className="grid grid-cols-3 gap-4">
          <input name="capturer" onChange={handleChange} placeholder="Capturer (Name)" className="input" />
          <input name="checkedBy" onChange={handleChange} placeholder="Checked By" className="input" />
          <input name="qualifyingDate" type="date" onChange={handleChange} className="input" />
        </div>
      </div>

      <button type="submit" className="btn-primary w-full bg-red-800 text-white py-3 rounded font-bold">Submit Form</button>
    </form>
  )
}