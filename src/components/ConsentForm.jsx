import React ,{ useState } from 'react'
import SignatureCanvas from 'react-signature-canvas'

export default function ConsentForm() {
  const [consent, setConsent] = useState(false)
  let sigPad = null

  const clear = () => sigPad.clear()

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!consent) {
      alert('Please check the consent box.')
      return
    }
    alert('Consent signed! Ready for Sanlam.')
    clear()
  }

  return (
    <form onSubmit={handleSubmit} className='p-4 bg-white shadow rounded-2xl space-y-4'>
      <h2 className='text-xl font-semibold text-red-600 mb-2'>Consent Form</h2>
      <label className='flex items-center gap-2'>
        <input type='checkbox' checked={consent} onChange={e => setConsent(e.target.checked)} />
        I consent to data processing by Thusanang Digital.
      </label>
      <SignatureCanvas penColor='green' canvasProps={{ width: 300, height: 100, className: 'border rounded' }} ref={(ref) => { sigPad = ref }} />
      <div className='flex gap-2'>
        <button type='button' onClick={clear} className='bg-gray-200 px-4 py-2 rounded'>Clear</button>
        <button type='submit' className='bg-green-500 text-white px-4 py-2 rounded'>Submit</button>
      </div>
    </form>
  )
}
