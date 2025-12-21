import React from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Loader2, Save, Printer, MoreVertical, FileText, PackagePlus, CloudOff } from 'lucide-react';

interface ConsultationActionsProps {
    isOnline: boolean;
    isSaving: boolean;
    onSave: () => void;
    onSaveAndPrint: () => void;

    onSaveBundleClick: () => void;
    onMedicalCertificateClick: () => void;
    onReceiptClick: () => void;
    onManageMedicationsClick: () => void;
    onManageKeywordsClick: () => void;
    onManageShortcutsClick: () => void;
}

export const ConsultationActions: React.FC<ConsultationActionsProps> = ({
    isOnline,
    isSaving,
    onSave,
    onSaveAndPrint,
    onSaveBundleClick,
    onMedicalCertificateClick,
    onReceiptClick,
    onManageMedicationsClick,
    onManageKeywordsClick,
    onManageShortcutsClick
}) => {
    return (
        <div className="pt-6 flex flex-col sm:flex-row items-center sm:justify-end gap-4">
            <div className="flex items-center gap-2 w-full sm:w-auto">
                {!isOnline && <CloudOff className="h-5 w-5 text-yellow-600" />}
                <Button type="button" size="lg" onClick={onSave} disabled={isSaving}>
                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5 mr-2" />}
                    Save Changes
                </Button>
            </div>
            <div className="flex w-full sm:w-auto gap-3">
                <Button type="button" size="lg" onClick={onSaveAndPrint}>
                    <Printer className="w-5 h-5 mr-2" />
                    Print
                </Button>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button type="button" size="icon" variant="outline" className="h-12 w-12">
                            <MoreVertical className="w-5 h-5" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={onMedicalCertificateClick}>
                            <FileText className="w-4 h-4 mr-2" />
                            Medical Certificate
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={onReceiptClick}>
                            <FileText className="w-4 h-4 mr-2" />
                            Receipt
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={onSaveBundleClick}>
                            <PackagePlus className="w-4 h-4 mr-2" />
                            Save as Bundle
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={onManageMedicationsClick}>
                            <FileText className="w-4 h-4 mr-2" />
                            Manage Saved Medications
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={onManageKeywordsClick}>
                            <PackagePlus className="w-4 h-4 mr-2" />
                            Manage Keywords
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={onManageShortcutsClick}>
                            <FileText className="w-4 h-4 mr-2" />
                            Manage Shortcuts
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
};
