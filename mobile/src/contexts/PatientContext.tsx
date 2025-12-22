import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import {apiService} from '../services/api';
import type {Patient} from '../types/api';

interface PatientContextType {
  patient: Patient | null;
  isLoading: boolean;
  error: string | null;
  refreshPatient: () => Promise<void>;
  isPatientRole: boolean;
}

const PatientContext = createContext<PatientContextType | undefined>(undefined);

export const PatientProvider: React.FC<{children: ReactNode}> = ({
  children,
}) => {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPatientRole, setIsPatientRole] = useState(false);

  const refreshPatient = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const patients = await apiService.getPatients();
      console.log(
        '[PatientContext] Patients received:',
        patients.map(p => ({id: p.id, name: p.name, role: p.role})),
      );
      const patientRolePatient = patients.find(p => p.role === 'patient');
      const mainPatient = patientRolePatient ?? patients[0] ?? null;
      setPatient(mainPatient);
      const hasPatientRole = !!patientRolePatient;
      console.log(
        '[PatientContext] isPatientRole:',
        hasPatientRole,
        'mainPatient:',
        mainPatient
          ? {id: mainPatient.id, name: mainPatient.name, role: mainPatient.role}
          : null,
      );
      setIsPatientRole(hasPatientRole);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load patient';
      setError(errorMessage);
      setPatient(null);
      setIsPatientRole(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshPatient();
  }, []);

  return (
    <PatientContext.Provider
      value={{
        patient,
        isLoading,
        error,
        refreshPatient,
        isPatientRole,
      }}>
      {children}
    </PatientContext.Provider>
  );
};

export const usePatient = () => {
  const context = useContext(PatientContext);
  if (context === undefined) {
    throw new Error('usePatient must be used within a PatientProvider');
  }
  return context;
};
