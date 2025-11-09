import React from 'react'
import ApplicationForm from './components/ApplicationForm.jsx'
import ConsentForm from './components/ConsentForm.jsx'
 import ConsentFormPro from './components/ConsentFormPro.jsx'
import ApplicationFormOfficial from './components/ApplicationFormOfficial.jsx'
export default function App() {
  return (
    <div className='min-h-screen p-8 bg-gray-50'>
      <h1 className='text-3xl font-bold text-red-600 mb-6 text-center'>THUSANANG DIGITAL SYSTEM</h1>
      <div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
        <ApplicationFormOfficial/>
        <ConsentFormPro/>
      </div>
    </div>
  )
}
