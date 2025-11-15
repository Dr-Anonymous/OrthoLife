
import React from 'react';
import { format, addDays } from 'date-fns';

interface Patient {
  id: string;
  name: string;
  sex: string;
}

interface MedicalCertificateProps {
  patient: Patient;
  diagnosis: string;
  consultationDate: Date;
  certificateData: {
    restPeriodDays: number;
    restPeriodStartDate: Date;
    treatmentFromDate: Date;
  };
}

export const MedicalCertificate: React.FC<MedicalCertificateProps> = ({
  patient,
  diagnosis,
  consultationDate,
  certificateData,
}) => {
  const { restPeriodDays, restPeriodStartDate, treatmentFromDate } = certificateData;
  const restPeriodEndDate = addDays(restPeriodStartDate, restPeriodDays - 1);
  const patientPrefix = patient.sex === 'M' ? 'Mr.' : 'Mrs.';

  return (
    <div className="bg-white text-black font-sans">
      {/* Page 1 */}
      <div className="w-[210mm] h-[297mm] p-8 flex flex-col border-b-2 border-gray-300">
        <header className="flex justify-between items-start mb-8">
          <img src="/logo.png" alt="OrthoLife Logo" className="h-20" />
          <div className="text-right">
            <h1 className="text-2xl font-bold text-blue-600">Dr Samuel Manoj Cherukuri</h1>
            <p className="text-sm">MBBS, MS Ortho(Manipal)</p>
            <p className="text-sm">Orthopaedic surgeon (APMC 95695)</p>
            <p className="text-sm mt-2">📞 98668 12555 📧 info@ortho.life</p>
          </div>
        </header>
        <div className="absolute top-4 right-8 text-sm text-gray-500">
          {format(new Date(), 'dd-MM-yyyy')}
        </div>

        <main className="flex-grow">
          <h2 className="text-2xl font-bold text-center underline mb-12">
            Medical certificate
          </h2>
          <div className="text-lg leading-relaxed space-y-6">
            <p>
              This is to certify that {patientPrefix} <strong>{patient.name}</strong>, bearing ID No.: <strong>{patient.id}</strong>
              &nbsp;has presented with <strong>{diagnosis}</strong> to our healthcare facility on <strong>{format(consultationDate, 'PPP')}</strong>.
              He/She is under treatment for the above condition from <strong>{format(treatmentFromDate, 'PPP')}</strong> to the present date.
            </p>
            <p>
              He/She has been prescribed medication, physiotherapy and rest for a period of <strong>{restPeriodDays}</strong> days
              from <strong>{format(restPeriodStartDate, 'PPP')}</strong> to <strong>{format(restPeriodEndDate, 'PPP')}</strong>.
            </p>
            <p>
              He/She needs to be reevaluated on follow-up to certify fitness.
            </p>
          </div>
        </main>

        <footer className="mt-auto">
            <div className="flex justify-between items-end">
                <div></div>
                <div className="text-center">
                    <img src="/sign.png" alt="Doctor's Signature" className="h-20" />
                    <div className="relative">
                        <img src="/seal.png" alt="Doctor's Seal" className="h-24 absolute -top-16 left-1/2 -translate-x-1/2 opacity-50" />
                        <p className="font-bold">Dr Samuel Manoj Ch</p>
                        <p className="text-sm">MS Orthopaedics</p>
                        <p className="text-sm">Reg. APMC 95695</p>
                        <p className="font-semibold">📞 9866812555</p>
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
        <header className="flex justify-end items-start mb-8">
            <div className="text-sm text-gray-500">
                {format(new Date(), 'dd-MM-yyyy')}
            </div>
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
