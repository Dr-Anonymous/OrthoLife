
import React from 'react';
import { format, addDays } from 'date-fns';

interface Patient {
  id: string;
  name: string;
  sex: string;
}

import { CertificateData } from './MedicalCertificateModal';

interface MedicalCertificateProps {
  patient: Patient;
  diagnosis: string;
  consultationDate: Date;
  certificateData: CertificateData;
}

export const MedicalCertificate: React.FC<MedicalCertificateProps> = ({
  patient,
  diagnosis,
  consultationDate,
  certificateData,
}) => {
  const { restPeriodDays, restPeriodStartDate, treatmentFromDate, rejoinDate, rejoinActivity } = certificateData;
  const restPeriodEndDate = addDays(restPeriodStartDate, restPeriodDays - 1);
  const patientPrefix = patient.sex === 'M' ? 'Mr.' : 'Mrs.';
  const pronounHeShe = patient.sex === 'M' ? 'He' : 'She';
  const pronounHeSheLower = patient.sex === 'M' ? 'he' : 'she';

  const backgroundPattern = `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23dbeafe' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`;

  return (
    <div className="bg-white text-black font-sans p-8">
      {/* Page 1 */}
      <div className="w-[210mm] h-[297mm] p-8 flex flex-col border-b-2 border-gray-300">
        <header
          className="flex justify-between items-center pb-4 border-b-2 border-primary-light rounded-t-lg"
          style={{ backgroundImage: backgroundPattern }}
        >
          <div className="flex items-center">
            <img src="/logo.png" alt="Clinic Logo" className="h-24 w-auto" />
          </div>
          <div className="text-right">
            <h2 className="text-xl font-heading font-bold text-primary" style={{ fontFamily: 'var(--font-heading)' }}>Dr Samuel Manoj Cherukuri</h2>
            <p className="text-muted-foreground">MBBS, MS Ortho (Manipal)</p>
            <p className="text-muted-foreground">Orthopaedic Surgeon</p>
            <p className="mt-2 text-gray-700">
              <span className="font-semibold">📞 98668 12555</span>
              <span className="mx-2">|</span>
              <span className="font-semibold">📧 info@ortho.life</span>
            </p>
          </div>
        </header>

        <div className="text-right py-2 text-muted-foreground">
          {format(new Date(), 'dd/MM/yyyy')}
        </div>

        <main className="flex-grow">
          <h2 className="text-2xl font-bold text-center underline mb-12">
            Medical certificate
          </h2>
          <div className="text-lg leading-relaxed space-y-6">
            <p>
              This is to certify that {patientPrefix} <strong>{patient.name}</strong>, bearing ID No.: <strong>{patient.id}</strong>
              &nbsp;has presented with <strong>{diagnosis}</strong> to our healthcare facility on <strong>{format(consultationDate, 'PPP')}</strong>.
              {pronounHeShe} is under treatment for the above condition from <strong>{format(treatmentFromDate, 'PPP')}</strong> to the present date.
            </p>
            <p>
              {pronounHeShe} has been prescribed medication, physiotherapy and rest for a period of <strong>{restPeriodDays}</strong> days
              from <strong>{format(restPeriodStartDate, 'PPP')}</strong> to <strong>{format(restPeriodEndDate, 'PPP')}</strong>.
            </p>
            {rejoinDate && rejoinActivity ? (
              <p>
                {pronounHeShe} has been reevaluated on follow-up and found to be fit to resume {pronounHeSheLower === 'he' ? 'his' : 'her'} <strong>{rejoinActivity}</strong> duties from <strong>{format(rejoinDate, 'PPP')}</strong>.
              </p>
            ) : (
              <p>
                {pronounHeShe} needs to be reevaluated on follow-up to certify fitness.
              </p>
            )}
          </div>
        </main>

        <footer className="mt-auto">
            <div className="flex justify-between items-end">
                <div></div>
                <div className="text-center">
                    <img src="/sign.png" alt="Doctor's Signature" className="h-20" />
                    <div className="relative">
                        <img src="/seal.png" alt="Doctor's Seal" className="h-24 absolute -top-16 left-1/2 -translate-x-1/2 opacity-50" />
                    </div>
                </div>
            </div>
          <div className="border-t-2 border-blue-600 pt-4 mt-8 text-center text-sm">
             <p>OrthoLife</p>
             <p>📍 Road No. 3, RR Nagar, Kakinada-03.</p>
          </div>
        </footer>
      </div>

      {/* Page 2 */}
      <div className="w-[210mm] h-[297mm] p-8 flex flex-col">
        <header className="flex justify-end items-start mb-8 h-8">
            {/* Empty header for spacing, date removed */}
        </header>
        <main className="flex-grow flex items-center justify-center">
          <p className="text-xl font-semibold text-gray-600">
            THIS DOCUMENT IS NOT INTENDED FOR MEDICOLEGAL PURPOSES
          </p>
        </main>
        <footer className="mt-auto border-t-2 border-blue-600 pt-4 text-center text-sm">
             <p>OrthoLife</p>
             <p>📍 Road No. 3, RR Nagar, Kakinada-03.</p>
        </footer>
      </div>
    </div>
  );
};
