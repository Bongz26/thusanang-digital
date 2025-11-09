import React, { useState } from 'react'
import SignatureCanvas from 'react-signature-canvas'
import { supabase } from '../supabaseClient'

export default function ApplicationForm() {
  const [formData, setFormData] = useState({ name: '', policy: '', amount: '' })
  let sigPad = null

  const clear = () => sigPad.clear()

  const handleSubmit = async (e) => {
    e.preventDefault()
    const signature = sigPad.getTrimmedCanvas().toDataURL('image/png')

    const { error } = await supabase.from('applications').insert([
      {
        name: formData.name,
        policy: formData.policy,
        amount: formData.amount,
        signature,
      },
    ])

    if (!error) {
      alert('Form saved successfully!')
      downloadCSV()
      clear()
    } else {
      console.error(error)
      alert('Error saving data.')
    }
  }

  const downloadCSV = () => {
    const csv = `Name,Policy,Amount\n${formData.name},${formData.policy},${formData.amount}`
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'Policy24_Import.csv'
    a.click()
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-white shadow rounded-2xl space-y-4">
      <h2 className="text-xl font-semibold text-red-600 mb-2">Application Form</h2>
      <input
        type="text"
        placeholder="Full Name"
        className="w-full border p-2 rounded"
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
      />
      <input
        type="text"
        placeholder="Policy Number"
        className="w-full border p-2 rounded"
        onChange={(e) => setFormData({ ...formData, policy: e.target.value })}
      />
      <input
        type="number"
        placeholder="Amount"
        className="w-full border p-2 rounded"
        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
      />
      <SignatureCanvas
        penColor="blue"
        canvasProps={{ width: 300, height: 100, className: 'border rounded' }}
        ref={(ref) => {
          sigPad = ref
        }}
      />
      <div className="flex gap-2">
        <button type="button" onClick={clear} className="bg-gray-200 px-4 py-2 rounded">
          Clear
        </button>
        <button type="submit" className="bg-red-500 text-white px-4 py-2 rounded">
          Submit
        </button>
      </div>
    </form>
  )
}