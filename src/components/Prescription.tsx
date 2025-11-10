import React from 'react';
import { format } from 'date-fns';

interface Medication {
  name: string;
  dose: string;
  freqMorning: boolean;
  freqNoon: boolean;
  freqNight: boolean;
  frequency: string;
  duration: string;
  instructions: string;
  notes: string;
}

interface Patient {
  name: string;
  dob: string;
  sex: string;
  phone: string;
  id: string;
}

interface ConsultationData {
  complaints: string;
  findings: string;
  investigations: string;
  diagnosis: string;
  advice: string;
  followup: string;
  medications: Medication[];
}

interface PrescriptionProps {
  patient: Patient;
  consultation: ConsultationData;
  consultationDate: Date;
  age: number | '';
}

export const Prescription: React.FC<PrescriptionProps> = React.forwardRef<HTMLDivElement, PrescriptionProps>(({ patient, consultation, consultationDate, age }, ref) => {
  return (
    <div ref={ref} className="p-8 font-sans text-sm bg-white text-gray-900">
      {/* Header */}
      <header className="flex justify-between items-start pb-4 border-b-2 border-gray-200">
        <div className="flex items-center">
          <img src="/badam-logo.png" alt="Clinic Logo" className="h-20 w-20 mr-4" />
          <div>
            <h1 className="text-xl font-bold text-blue-600">Dr. Badam Balakrishna</h1>
            <p className="text-gray-600">Clinical Lab</p>
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-xl font-bold text-blue-600">Dr Samuel Manoj Cherukuri</h2>
          <p className="text-gray-600">MBBS, MS Ortho (Manipal)</p>
          <p className="text-gray-600">Orthopaedic Surgeon</p>
          <p className="mt-2 text-gray-700">
            <span className="font-semibold">📞 98668 12555</span>
            <span className="mx-2">|</span>
            <span className="font-semibold">📧 info@ortho.life</span>
          </p>
        </div>
      </header>

      {/* Patient Info */}
      <section className="flex justify-between py-4 border-b border-gray-200">
        <div>
          <p><span className="font-semibold">Name:</span> {patient.name}</p>
          <p><span className="font-semibold">D.O.B:</span> {patient.dob ? format(new Date(patient.dob), 'yyyy-MM-dd') : 'N/A'}</p>
          <p><span className="font-semibold">Phone:</span> {patient.phone}</p>
        </div>
        <div className="text-right">
          <p><span className="font-semibold">Sex:</span> {patient.sex}</p>
          <p><span className="font-semibold">Age:</span> {age}</p>
          <p><span className="font-semibold">ID No:</span> {patient.id.substring(0, 8)}</p>
        </div>
      </section>

      {/* Date */}
      <div className="text-right py-2 text-gray-600">
        {format(consultationDate, 'dd/MM/yyyy')}
      </div>

      {/* Medical Info */}
      <section className="space-y-4">
        <div>
          <h3 className="font-semibold">Complaints:</h3>
          <p>{consultation.complaints}</p>
        </div>
        <div>
          <h3 className="font-semibold">Findings:</h3>
          <p>{consultation.findings}</p>
        </div>
        <div>
          <h3 className="font-semibold">Investigations:</h3>
          <p>{consultation.investigations}</p>
        </div>
        <div>
          <h3 className="font-semibold">Diagnosis:</h3>
          <p>{consultation.diagnosis}</p>
        </div>
        <div>
          <h3 className="font-semibold">Advice:</h3>
          <p className="whitespace-pre-wrap">{consultation.advice}</p>
        </div>
      </section>

      {/* Medications */}
      <section className="mt-6">
        <h3 className="font-semibold mb-2">Medication:</h3>
        <table className="w-full border-collapse border border-gray-400">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 p-2 text-left">N</th>
              <th className="border border-gray-300 p-2 text-left">Name</th>
              <th className="border border-gray-300 p-2 text-left">Dose</th>
              <th className="border border-gray-300 p-2 text-center" colSpan={3}>Frequency</th>
              <th className="border border-gray-300 p-2 text-left">Duration</th>
              <th className="border border-gray-300 p-2 text-left">Instructions</th>
            </tr>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 p-1"></th>
              <th className="border border-gray-300 p-1"></th>
              <th className="border border-gray-300 p-1"></th>
              <th className="border border-gray-300 p-1 text-center text-xs">Morning</th>
              <th className="border border-gray-300 p-1 text-center text-xs">A.Noon</th>
              <th className="border border-gray-300 p-1 text-center text-xs">Night</th>
              <th className="border border-gray-300 p-1"></th>
              <th className="border border-gray-300 p-1"></th>
            </tr>
          </thead>
          <tbody>
            {consultation.medications.map((med, index) => (
              <React.Fragment key={index}>
                <tr>
                  <td className="border border-gray-300 p-2">{index + 1}</td>
                  <td className="border border-gray-300 p-2">{med.name}</td>
                  <td className="border border-gray-300 p-2">{med.dose}</td>
                  <td className="border border-gray-300 p-2 text-center">{med.freqMorning ? '✔' : ''}</td>
                  <td className="border border-gray-300 p-2 text-center">{med.freqNoon ? '✔' : ''}</td>
                  <td className="border border-gray-300 p-2 text-center">{med.freqNight ? '✔' : ''}</td>
                  <td className="border border-gray-300 p-2">{med.duration}</td>
                  <td className="border border-gray-300 p-2">{med.instructions}</td>
                </tr>
                {med.notes && (
                  <tr>
                    <td colSpan={8} className="border border-gray-300 p-2 text-xs italic">
                      {med.notes}
                    </td>
                  </tr>
                )}
                 {med.frequency && (
                    <tr>
                        <td colSpan={8} className="border border-gray-300 p-2 text-xs">
                        <strong>Frequency:</strong> {med.frequency}
                        </td>
                    </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </section>

      {/* Followup */}
      <section className="mt-6">
        <h3 className="font-semibold">Followup:</h3>
        <p>{consultation.followup}</p>
      </section>

      {/* Footer */}
      <footer className="mt-20 pt-4 border-t-2 border-gray-200 flex justify-between items-center">
        <p className="text-blue-600 font-semibold">Visit ortho.life/my-space to access your prescriptions, diets, and exercises anytime.</p>
        <img src="/qr-code.png" alt="QR Code" className="h-16 w-16" />
      </footer>
    </div>
  );
});

Prescription.displayName = 'Prescription';
