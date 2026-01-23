import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { ArrowUpDown, ArrowUp, ArrowDown, Filter, Check, X, Calendar, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import ConsultationCard from '@/components/consultation/ConsultationCard';

import { Consultation, Patient } from '@/types/consultation';

interface ConsultationDetailsTableProps {
  title: string;
  data: Consultation[];
  onFilteredDataChange?: (data: Consultation[]) => void;
}

type SortDirection = 'asc' | 'desc';
interface SortConfig {
  key: string;
  direction: SortDirection;
}

interface FilterState {
  location: string[];
  visit_type: string[];
  status: string[];
}

export const ConsultationDetailsTable = ({ title, data, onFilteredDataChange }: ConsultationDetailsTableProps) => {
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [filters, setFilters] = useState<FilterState & { hasProcedure: boolean }>({
    location: [],
    visit_type: [],
    status: [],
    hasProcedure: false,
  });
  const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null);

  // Extract unique values for filters
  const filterOptions = useMemo(() => {
    const locations = new Set<string>();
    const visitTypes = new Set<string>();
    const statuses = new Set<string>();

    data.forEach(item => {
      if (item.location) locations.add(item.location);
      if (item.visit_type) visitTypes.add(item.visit_type);
      statuses.add(item.status);
    });

    return {
      location: Array.from(locations).sort(),
      visit_type: Array.from(visitTypes).sort(),
      status: Array.from(statuses).sort(),
    };
  }, [data]);

  const handleSort = (key: string) => {
    let direction: SortDirection = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const renderSortIcon = (key: string) => {
    if (!sortConfig || sortConfig.key !== key) {
      return <ArrowUpDown className="w-4 h-4 ml-1 inline-block text-gray-400" />;
    }
    return sortConfig.direction === 'asc' ?
      <ArrowUp className="w-4 h-4 ml-1 inline-block text-primary" /> :
      <ArrowDown className="w-4 h-4 ml-1 inline-block text-primary" />;
  };

  const toggleFilter = (category: keyof FilterState, value: string) => {
    setFilters(prev => {
      const current = prev[category];
      const next = current.includes(value)
        ? current.filter(item => item !== value)
        : [...current, value];
      return { ...prev, [category]: next };
    });
  };

  const toggleHasProcedure = () => {
    setFilters(prev => ({ ...prev, hasProcedure: !prev.hasProcedure }));
  };

  const resetFilters = () => {
    setFilters({
      location: [],
      visit_type: [],
      status: [],
      hasProcedure: false,
    });
  };

  const filteredAndSortedData = useMemo(() => {
    let result = [...data];

    // Apply filters
    if (filters.location.length > 0) {
      result = result.filter(item => filters.location.includes(item.location || ''));
    }
    if (filters.visit_type.length > 0) {
      result = result.filter(item => filters.visit_type.includes(item.visit_type || ''));
    }
    if (filters.status.length > 0) {
      result = result.filter(item => filters.status.includes(item.status));
    }
    if (filters.hasProcedure) {
      result = result.filter(item => !!item.consultation_data?.procedure);
    }

    // Apply sort
    if (sortConfig) {
      result.sort((a, b) => {
        let aValue: any = '';
        let bValue: any = '';

        switch (sortConfig.key) {
          case 'date':
            aValue = new Date(a.created_at).getTime();
            bValue = new Date(b.created_at).getTime();
            break;
          case 'patient':
            aValue = a.patient.name.toLowerCase();
            bValue = b.patient.name.toLowerCase();
            break;
          case 'phone':
            aValue = a.patient.phone;
            bValue = b.patient.phone;
            break;
          case 'location':
            aValue = (a.location || '').toLowerCase();
            bValue = (b.location || '').toLowerCase();
            break;
          case 'visit_type':
            aValue = (a.visit_type || '').toLowerCase();
            bValue = (b.visit_type || '').toLowerCase();
            break;
          case 'status':
            aValue = a.status.toLowerCase();
            bValue = b.status.toLowerCase();
            break;
          default:
            return 0;
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [data, filters, sortConfig]);

  // Notify parent of filtered data changes
  useMemo(() => {
    if (onFilteredDataChange) {
      onFilteredDataChange(filteredAndSortedData);
    }
  }, [filteredAndSortedData, onFilteredDataChange]);

  const activeFilterCount = Object.values(filters).reduce((acc, curr) => {
    if (typeof curr === 'boolean') return acc + (curr ? 1 : 0);
    return acc + curr.length;
  }, 0);

  return (
    <div className="mt-8 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold">{title}</h3>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 border-dashed">
              <Filter className="mr-2 h-4 w-4" />
              Filter
              {activeFilterCount > 0 && (
                <>
                  <Separator orientation="vertical" className="mx-2 h-4" />
                  <Badge variant="secondary" className="rounded-sm px-1 font-normal lg:hidden">
                    {activeFilterCount}
                  </Badge>
                  <div className="hidden space-x-1 lg:flex">
                    {activeFilterCount > 2 ? (
                      <Badge variant="secondary" className="rounded-sm px-1 font-normal">
                        {activeFilterCount} selected
                      </Badge>
                    ) : (
                      <>
                        {Object.entries(filters).flatMap(([category, values]) => {
                          if (category === 'hasProcedure') {
                            return values ? [
                              <Badge variant="secondary" key="has-procedure" className="rounded-sm px-1 font-normal">
                                With Procedure
                              </Badge>
                            ] : [];
                          }
                          return (values as string[]).map(value => (
                            <Badge variant="secondary" key={`${category}-${value}`} className="rounded-sm px-1 font-normal">
                              {value}
                            </Badge>
                          ));
                        })}
                      </>
                    )}
                  </div>
                </>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[240px] p-0" align="end">
            <Command>
              <CommandInput placeholder="Filter statistics..." />
              <CommandList>
                <CommandEmpty>No results found.</CommandEmpty>

                <CommandGroup heading="Options">
                  <CommandItem
                    onSelect={toggleHasProcedure}
                  >
                    <div
                      className={cn(
                        "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                        filters.hasProcedure
                          ? "bg-primary text-primary-foreground"
                          : "opacity-50 [&_svg]:invisible"
                      )}
                    >
                      <Check className={cn("h-4 w-4")} />
                    </div>
                    <span>With Procedure</span>
                  </CommandItem>
                </CommandGroup>

                {filterOptions.location.length > 0 && (
                  <CommandGroup heading="Location">
                    {filterOptions.location.map(option => (
                      <CommandItem
                        key={`location-${option}`}
                        onSelect={() => toggleFilter('location', option)}
                      >
                        <div
                          className={cn(
                            "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                            filters.location.includes(option)
                              ? "bg-primary text-primary-foreground"
                              : "opacity-50 [&_svg]:invisible"
                          )}
                        >
                          <Check className={cn("h-4 w-4")} />
                        </div>
                        <span>{option}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                {filterOptions.visit_type.length > 0 && (
                  <>
                    <CommandSeparator />
                    <CommandGroup heading="Visit Type">
                      {filterOptions.visit_type.map(option => (
                        <CommandItem
                          key={`visit_type-${option}`}
                          onSelect={() => toggleFilter('visit_type', option)}
                        >
                          <div
                            className={cn(
                              "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                              filters.visit_type.includes(option)
                                ? "bg-primary text-primary-foreground"
                                : "opacity-50 [&_svg]:invisible"
                            )}
                          >
                            <Check className={cn("h-4 w-4")} />
                          </div>
                          <span className="capitalize">{option}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </>
                )}

                {filterOptions.status.length > 0 && (
                  <>
                    <CommandSeparator />
                    <CommandGroup heading="Status">
                      {filterOptions.status.map(option => (
                        <CommandItem
                          key={`status-${option}`}
                          onSelect={() => toggleFilter('status', option)}
                        >
                          <div
                            className={cn(
                              "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                              filters.status.includes(option)
                                ? "bg-primary text-primary-foreground"
                                : "opacity-50 [&_svg]:invisible"
                            )}
                          >
                            <Check className={cn("h-4 w-4")} />
                          </div>
                          <span className="capitalize">{option}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </>
                )}

                {activeFilterCount > 0 && (
                  <>
                    <CommandSeparator />
                    <CommandGroup>
                      <CommandItem
                        onSelect={resetFilters}
                        className="justify-center text-center font-medium"
                      >
                        Clear filters
                      </CommandItem>
                    </CommandGroup>
                  </>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('date')}>
                Date {renderSortIcon('date')}
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('patient')}>
                Patient Name {renderSortIcon('patient')}
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('phone')}>
                Phone {renderSortIcon('phone')}
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('location')}>
                Location {renderSortIcon('location')}
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('visit_type')}>
                Payment {renderSortIcon('visit_type')}
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('status')}>
                Status {renderSortIcon('status')}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredAndSortedData.length > 0 ? (
              filteredAndSortedData.map((consultation) => (
                <tr key={consultation.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{format(new Date(consultation.created_at), 'PPP')}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    <button
                      onClick={() => setSelectedConsultation(consultation)}
                      className="text-left hover:underline text-primary focus:outline-none"
                    >
                      {consultation.patient.name}
                    </button>
                    {consultation.consultation_data?.procedure && (
                      <div className="text-xs text-gray-500 font-normal mt-0.5">
                        {consultation.consultation_data.procedure}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{consultation.patient.phone}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{consultation.location || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{consultation.visit_type || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${consultation.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {consultation.status}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                  No consultations found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="text-sm text-muted-foreground">
        Showing {filteredAndSortedData.length} of {data.length} records
      </div>

      <Dialog open={!!selectedConsultation} onOpenChange={(open) => !open && setSelectedConsultation(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Consultation Details</DialogTitle>
          </DialogHeader>

          {selectedConsultation && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pb-4 border-b">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <p className="font-semibold">{format(new Date(selectedConsultation.created_at), 'PPP')}</p>
                </div>
                {selectedConsultation.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">{selectedConsultation.location}</p>
                  </div>
                )}
                <span className={`px-2 py-0.5 text-xs rounded-full ${selectedConsultation.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                  {selectedConsultation.status}
                </span>
              </div>

              <div>
                <h3 className="font-semibold text-lg">{selectedConsultation.patient.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {selectedConsultation.patient.phone}
                </p>
              </div>

              {selectedConsultation.consultation_data && (
                <ConsultationCard data={selectedConsultation.consultation_data} />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
