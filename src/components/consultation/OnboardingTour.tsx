
import React from 'react';
import { Joyride, Step, EventData, STATUS } from 'react-joyride';

interface OnboardingTourProps {
    run: boolean;
    onComplete: () => void;
}

export const OnboardingTour = ({ run, onComplete }: OnboardingTourProps) => {
    const steps: Step[] = [
        {
            target: 'body',
            placement: 'center',
            content: (
                <div className="space-y-2 text-left">
                    <h3 className="font-bold text-lg text-primary">Welcome to OrthoLife! 🚀</h3>
                    <p className="text-sm">Let's take a quick 1-minute tour to help you master the faster workflow designed for orthopaedic practice.</p>
                </div>
            ),
            skipBeacon: true,
        },
        {
            target: '#profile-settings-button',
            content: (
                <div className="space-y-2 text-left">
                    <h4 className="font-bold text-primary">Your Practice Profile</h4>
                    <p className="text-sm">Manage your profile, clinic locations and review periods in your <strong>Profile</strong>. Use the <strong>Handbook (📖)</strong> right next to it for quick references of clinical shortcuts and logic.</p>
                </div>
            ),
        },
        {
            target: '#registration-button',
            content: (
                <div className="space-y-2 text-left">
                    <h4 className="font-bold text-primary">Patient Registration</h4>
                    <p className="text-sm">Start here to register a new patient. The EMR automatically checks for duplicates by phone number.</p>
                </div>
            ),
        },
        {
            target: '#vitals-section',
            content: (
                <div className="space-y-2 text-left">
                    <h4 className="font-bold text-primary">Smart Vitals</h4>
                    <p className="text-sm">Weight, BP, and SpO2 are tracked here. Notice how BP categories (Normal, Stage 1/2) update automatically based on values.</p>
                </div>
            ),
        },
        {
            target: '#clinical-notes-section',
            content: (
                <div className="space-y-2 text-left">
                    <h4 className="font-bold text-primary">Clinical Shorthand</h4>
                    <p className="text-sm italic">"Don't type more, type faster."</p>
                    <p className="text-sm">Use your custom shorthand (like <code className="font-bold bg-muted px-1 rounded">ra.</code> or <code className="font-bold bg-muted px-1 rounded">2w.</code>) to expand text instantly. Manage your personal shortcuts in **More Actions &gt; Shortcuts**.</p>
                </div>
            ),
        },
        {
            target: '#medications-section',
            content: (
                <div className="space-y-2 text-left">
                    <h4 className="font-bold text-primary">Medication Protocols</h4>
                    <p className="text-sm">Type <code className="font-bold text-primary">//</code> in the drug name field to open your saved Protocols and load complete prescription sets in one click.</p>
                </div>
            ),
        },
        {
            target: '#save-print-button',
            content: (
                <div className="space-y-2 text-left">
                    <h4 className="font-bold text-primary">Finalize & Go Digital</h4>
                    <p className="text-sm">Save and Print to generate a bilingual prescription. The system automatically sends a WhatsApp link to the Patient Portal if enabled.</p>
                </div>
            ),
        },
        {
            target: '#more-actions-button',
            content: (
                <div className="space-y-2 text-left">
                    <h4 className="font-bold text-primary">More Actions</h4>
                    <p className="text-sm">Manage advanced settings here: issue Medical Certificates, Receipts, and configure your clinical protocols/shorthand triggers.</p>
                </div>
            ),
        },
    ];

    const handleJoyrideCallback = (data: EventData) => {
        const { status } = data;
        const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

        if (finishedStatuses.includes(status)) {
            onComplete();
        }
    };

    return (
        <Joyride
            onEvent={handleJoyrideCallback}
            continuous
            run={run}
            scrollToFirstStep
            steps={steps}
            options={{
                primaryColor: '#0ea5e9',
                zIndex: 10000,
                showProgress: true,
                buttons: ['back', 'primary', 'skip'],
            }}
            styles={{
                tooltipContainer: {
                    textAlign: 'left',
                },
                buttonPrimary: {
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                },
                buttonBack: {
                    fontSize: '14px',
                },
                buttonSkip: {
                    fontSize: '14px',
                    color: '#64748b',
                }
            }}
            locale={{
                last: 'Finish Tour',
                skip: 'Skip Tour'
            }}
        />
    );
};
