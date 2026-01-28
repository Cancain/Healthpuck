import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import {apiService} from '../services/api';
import {useAuth} from './AuthContext';
import type {Patient} from '../types/api';

interface Organisation {
  organisationId: number;
  organisationName: string;
}

interface PatientContextType {
  patient: Patient | null;
  isLoading: boolean;
  error: string | null;
  refreshPatient: () => Promise<void>;
  isPatientRole: boolean;
  isCaretakerRole: boolean;
  organisation: Organisation | null;
  hasOrganisation: boolean;
}

const PatientContext = createContext<PatientContextType | undefined>(undefined);

export const PatientProvider: React.FC<{children: ReactNode}> = ({
  children,
}) => {
  const {isAuthenticated} = useAuth();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPatientRole, setIsPatientRole] = useState(false);
  const [isCaretakerRole, setIsCaretakerRole] = useState(false);
  const [organisation, setOrganisation] = useState<Organisation | null>(null);

  const refreshPatient = async () => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('[PatientContext] Fetching patients and organisation...');

      let patients: Patient[] = [];
      let org: Organisation | null = null;

      try {
        patients = await apiService.getPatients();
      } catch (err) {
        console.warn('[PatientContext] Error fetching patients:', err);
      }

      try {
        org = await apiService.getOrganisation();
      } catch (err) {
        console.log(
          '[PatientContext] User is not a caregiver (no organisation found)',
        );
      }

      console.log(
        '[PatientContext] Patients received:',
        patients.length,
        'patient(s)',
        patients.map((p: Patient) => ({id: p.id, name: p.name, role: p.role})),
      );
      console.log('[PatientContext] Organisation:', org);

      const isCaretaker = !!org;
      setIsCaretakerRole(isCaretaker);
      setOrganisation(org);

      const patientRolePatient = patients.find(
        (p: Patient) => p.role === 'patient',
      );
      const mainPatient = patientRolePatient ?? patients[0] ?? null;
      setPatient(mainPatient);
      const hasPatientRole = !!patientRolePatient;

      console.log('[PatientContext] Patient context set:', {
        isPatientRole: hasPatientRole,
        isCaretakerRole: isCaretaker,
        mainPatient: mainPatient
          ? {id: mainPatient.id, name: mainPatient.name, role: mainPatient.role}
          : null,
        allPatients: patients.map((p: Patient) => ({
          id: p.id,
          name: p.name,
          role: p.role,
        })),
      });
      setIsPatientRole(hasPatientRole);
    } catch (err) {
      console.error('[PatientContext] Error loading patients:', err);
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load patient';
      setError(errorMessage);
      setPatient(null);
      setIsPatientRole(false);
      setIsCaretakerRole(false);
      setOrganisation(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      console.log('[PatientContext] User authenticated, fetching patients...');
      refreshPatient();
    } else {
      console.log(
        '[PatientContext] User not authenticated, clearing patient context',
      );
      setPatient(null);
      setIsPatientRole(false);
      setIsCaretakerRole(false);
      setOrganisation(null);
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (error) {
      console.error('[PatientContext] Error state:', error);
    }
  }, [error]);

  return (
    <PatientContext.Provider
      value={{
        patient,
        isLoading,
        error,
        refreshPatient,
        isPatientRole,
        isCaretakerRole,
        organisation,
        hasOrganisation: organisation !== null,
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
