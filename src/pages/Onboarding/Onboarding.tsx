import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import Button from "../../components/Button/Button";
import styles from "./Onboarding.module.css";
import { useAuth } from "../../auth/AuthContext";
import { apiService, type InviteUser, type InviteResult } from "../../services/api";

interface InviteForm {
  name: string;
  email: string;
  password: string;
}

const OnboardingPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [organisationName, setOrganisationName] = useState(
    user ? `${user.name}'s Organisation` : "",
  );
  const [patientInvites, setPatientInvites] = useState<InviteForm[]>([
    { name: "", email: "", password: "" },
  ]);
  const [caregiverInvites, setCaregiverInvites] = useState<InviteForm[]>([
    { name: "", email: "", password: "" },
  ]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiErrors, setApiErrors] = useState<string[]>([]);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const validateOrganisationName = (): boolean => {
    const trimmed = organisationName.trim();
    if (!trimmed) {
      setErrors({ organisationName: "Organisationsnamn krävs" });
      return false;
    }
    if (trimmed.length > 100) {
      setErrors({ organisationName: "Organisationsnamn får inte vara längre än 100 tecken" });
      return false;
    }
    setErrors({});
    return true;
  };

  const validateInvites = (invites: InviteForm[], type: "patient" | "caregiver"): boolean => {
    const newErrors: Record<string, string> = {};
    const emailSet = new Set<string>();

    invites.forEach((invite, index) => {
      const prefix = `${type}-${index}`;

      if (!invite.name.trim()) {
        newErrors[`${prefix}-name`] = "Namn krävs";
      }

      if (!invite.email.trim()) {
        newErrors[`${prefix}-email`] = "E-post krävs";
      } else if (!emailRegex.test(invite.email)) {
        newErrors[`${prefix}-email`] = "Ogiltig e-postadress";
      } else if (emailSet.has(invite.email.toLowerCase())) {
        newErrors[`${prefix}-email`] = "Duplicerad e-postadress";
      } else {
        emailSet.add(invite.email.toLowerCase());
      }

      if (!invite.password) {
        newErrors[`${prefix}-password`] = "Lösenord krävs";
      } else if (invite.password.length < 8) {
        newErrors[`${prefix}-password`] = "Lösenord måste vara minst 8 tecken";
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleStep1 = async () => {
    if (!validateOrganisationName()) return;

    setLoading(true);
    setApiErrors([]);
    try {
      await apiService.createOrganisation(organisationName.trim());
      setCurrentStep(2);
    } catch (err) {
      setApiErrors([err instanceof Error ? err.message : "Kunde inte skapa organisation"]);
    } finally {
      setLoading(false);
    }
  };

  const handleStep2 = async () => {
    const validInvites = patientInvites.filter(
      (inv) => inv.name.trim() && inv.email.trim() && inv.password,
    );

    if (validInvites.length > 0 && !validateInvites(validInvites, "patient")) {
      return;
    }

    if (validInvites.length > 0) {
      setLoading(true);
      setApiErrors([]);
      try {
        const invites: InviteUser[] = validInvites.map((inv) => ({
          email: inv.email.trim(),
          name: inv.name.trim(),
          password: inv.password,
          role: "patient" as const,
        }));

        const result: InviteResult = await apiService.inviteUsersToOrganisation(invites);

        if (result.errors.length > 0) {
          const errorMessages = result.errors.map((e) => `${e.email}: ${e.error}`);
          setApiErrors(errorMessages);
        }

        if (result.created.length > 0) {
          setCurrentStep(3);
          setApiErrors([]);
        } else if (result.errors.length > 0) {
          setLoading(false);
          return;
        } else {
          setCurrentStep(3);
        }
      } catch (err) {
        setApiErrors([err instanceof Error ? err.message : "Kunde inte skapa patienter"]);
        setLoading(false);
        return;
      } finally {
        setLoading(false);
      }
    } else {
      setCurrentStep(3);
    }
  };

  const handleStep3 = async () => {
    const validInvites = caregiverInvites.filter(
      (inv) => inv.name.trim() && inv.email.trim() && inv.password,
    );

    if (validInvites.length > 0 && !validateInvites(validInvites, "caregiver")) {
      return;
    }

    if (validInvites.length > 0) {
      setLoading(true);
      setApiErrors([]);
      try {
        const invites: InviteUser[] = validInvites.map((inv) => ({
          email: inv.email.trim(),
          name: inv.name.trim(),
          password: inv.password,
          role: "caregiver" as const,
        }));

        const result: InviteResult = await apiService.inviteUsersToOrganisation(invites);

        if (result.errors.length > 0) {
          const errorMessages = result.errors.map((e) => `${e.email}: ${e.error}`);
          setApiErrors(errorMessages);
          setLoading(false);
          return;
        }
      } catch (err) {
        setApiErrors([err instanceof Error ? err.message : "Kunde inte skapa omsorgsgivare"]);
        setLoading(false);
        return;
      } finally {
        setLoading(false);
      }
    }

    navigate("/caregiver-dashboard");
  };

  const addPatientInvite = () => {
    setPatientInvites([...patientInvites, { name: "", email: "", password: "" }]);
  };

  const removePatientInvite = (index: number) => {
    if (patientInvites.length > 1) {
      setPatientInvites(patientInvites.filter((_, i) => i !== index));
    }
  };

  const updatePatientInvite = (index: number, field: keyof InviteForm, value: string) => {
    const updated = [...patientInvites];
    updated[index] = { ...updated[index], [field]: value };
    setPatientInvites(updated);
  };

  const addCaregiverInvite = () => {
    setCaregiverInvites([...caregiverInvites, { name: "", email: "", password: "" }]);
  };

  const removeCaregiverInvite = (index: number) => {
    if (caregiverInvites.length > 1) {
      setCaregiverInvites(caregiverInvites.filter((_, i) => i !== index));
    }
  };

  const updateCaregiverInvite = (index: number, field: keyof InviteForm, value: string) => {
    const updated = [...caregiverInvites];
    updated[index] = { ...updated[index], [field]: value };
    setCaregiverInvites(updated);
  };

  return (
    <div className={styles.container}>
      <div className={styles.wizard}>
        <div className={styles.stepIndicator}>
          <div className={styles.stepNumbers}>
            <span className={currentStep >= 1 ? styles.active : ""}>1</span>
            <span className={styles.separator}>→</span>
            <span className={currentStep >= 2 ? styles.active : ""}>2</span>
            <span className={styles.separator}>→</span>
            <span className={currentStep >= 3 ? styles.active : ""}>3</span>
          </div>
          <div className={styles.stepLabels}>
            <span>Organisation</span>
            <span>Patienter</span>
            <span>Omsorgsgivare</span>
          </div>
        </div>

        {apiErrors.length > 0 && (
          <div className={styles.apiErrors}>
            {apiErrors.map((error, idx) => (
              <div key={idx} className={styles.apiError}>
                {error}
              </div>
            ))}
          </div>
        )}

        {currentStep === 1 && (
          <div className={styles.step}>
            <h2 className={styles.stepTitle}>Skapa din organisation</h2>
            <p className={styles.stepDescription}>
              Ge din organisation ett namn. Du kan ändra detta senare.
            </p>

            <div className={styles.field}>
              <label htmlFor="organisationName">Organisationsnamn</label>
              <input
                id="organisationName"
                type="text"
                value={organisationName}
                onChange={(e) => setOrganisationName(e.target.value)}
                disabled={loading}
                maxLength={100}
                placeholder="Min organisation"
              />
              {errors.organisationName && (
                <span className={styles.fieldError}>{errors.organisationName}</span>
              )}
            </div>

            <div className={styles.actions}>
              <Button onClick={handleStep1} disabled={loading}>
                {loading ? "Skapar..." : "Fortsätt"}
              </Button>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className={styles.step}>
            <h2 className={styles.stepTitle}>Lägg till patienter</h2>
            <p className={styles.stepDescription}>
              Skapa konton för patienter i din organisation. Du kan hoppa över detta steg och lägga
              till patienter senare.
            </p>

            {patientInvites.map((invite, index) => (
              <div key={index} className={styles.inviteForm}>
                <div className={styles.inviteHeader}>
                  <h3>Patient {index + 1}</h3>
                  {patientInvites.length > 1 && (
                    <button
                      type="button"
                      className={styles.removeButton}
                      onClick={() => removePatientInvite(index)}
                      disabled={loading}
                    >
                      Ta bort
                    </button>
                  )}
                </div>

                <div className={styles.field}>
                  <label htmlFor={`patient-${index}-name`}>Namn</label>
                  <input
                    id={`patient-${index}-name`}
                    type="text"
                    value={invite.name}
                    onChange={(e) => updatePatientInvite(index, "name", e.target.value)}
                    disabled={loading}
                  />
                  {errors[`patient-${index}-name`] && (
                    <span className={styles.fieldError}>{errors[`patient-${index}-name`]}</span>
                  )}
                </div>

                <div className={styles.field}>
                  <label htmlFor={`patient-${index}-email`}>E-post</label>
                  <input
                    id={`patient-${index}-email`}
                    type="email"
                    value={invite.email}
                    onChange={(e) => updatePatientInvite(index, "email", e.target.value)}
                    disabled={loading}
                  />
                  {errors[`patient-${index}-email`] && (
                    <span className={styles.fieldError}>{errors[`patient-${index}-email`]}</span>
                  )}
                </div>

                <div className={styles.field}>
                  <label htmlFor={`patient-${index}-password`}>Lösenord</label>
                  <input
                    id={`patient-${index}-password`}
                    type="password"
                    value={invite.password}
                    onChange={(e) => updatePatientInvite(index, "password", e.target.value)}
                    disabled={loading}
                    minLength={8}
                  />
                  {errors[`patient-${index}-password`] && (
                    <span className={styles.fieldError}>{errors[`patient-${index}-password`]}</span>
                  )}
                </div>
              </div>
            ))}

            <div className={styles.actions}>
              <button
                type="button"
                className={styles.addButton}
                onClick={addPatientInvite}
                disabled={loading}
              >
                Lägg till patient
              </button>
            </div>

            <div className={styles.actions}>
              <Button onClick={() => setCurrentStep(3)} disabled={loading} variant="secondary">
                Hoppa över
              </Button>
              <Button onClick={handleStep2} disabled={loading}>
                {loading ? "Skapar..." : "Fortsätt"}
              </Button>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className={styles.step}>
            <h2 className={styles.stepTitle}>Lägg till omsorgsgivare</h2>
            <p className={styles.stepDescription}>
              Skapa konton för andra omsorgsgivare i din organisation. Du kan hoppa över detta steg.
            </p>

            {caregiverInvites.map((invite, index) => (
              <div key={index} className={styles.inviteForm}>
                <div className={styles.inviteHeader}>
                  <h3>Omsorgsgivare {index + 1}</h3>
                  {caregiverInvites.length > 1 && (
                    <button
                      type="button"
                      className={styles.removeButton}
                      onClick={() => removeCaregiverInvite(index)}
                      disabled={loading}
                    >
                      Ta bort
                    </button>
                  )}
                </div>

                <div className={styles.field}>
                  <label htmlFor={`caregiver-${index}-name`}>Namn</label>
                  <input
                    id={`caregiver-${index}-name`}
                    type="text"
                    value={invite.name}
                    onChange={(e) => updateCaregiverInvite(index, "name", e.target.value)}
                    disabled={loading}
                  />
                  {errors[`caregiver-${index}-name`] && (
                    <span className={styles.fieldError}>{errors[`caregiver-${index}-name`]}</span>
                  )}
                </div>

                <div className={styles.field}>
                  <label htmlFor={`caregiver-${index}-email`}>E-post</label>
                  <input
                    id={`caregiver-${index}-email`}
                    type="email"
                    value={invite.email}
                    onChange={(e) => updateCaregiverInvite(index, "email", e.target.value)}
                    disabled={loading}
                  />
                  {errors[`caregiver-${index}-email`] && (
                    <span className={styles.fieldError}>{errors[`caregiver-${index}-email`]}</span>
                  )}
                </div>

                <div className={styles.field}>
                  <label htmlFor={`caregiver-${index}-password`}>Lösenord</label>
                  <input
                    id={`caregiver-${index}-password`}
                    type="password"
                    value={invite.password}
                    onChange={(e) => updateCaregiverInvite(index, "password", e.target.value)}
                    disabled={loading}
                    minLength={8}
                  />
                  {errors[`caregiver-${index}-password`] && (
                    <span className={styles.fieldError}>
                      {errors[`caregiver-${index}-password`]}
                    </span>
                  )}
                </div>
              </div>
            ))}

            <div className={styles.actions}>
              <button
                type="button"
                className={styles.addButton}
                onClick={addCaregiverInvite}
                disabled={loading}
              >
                Lägg till omsorgsgivare
              </button>
            </div>

            <div className={styles.actions}>
              <Button onClick={handleStep3} disabled={loading} variant="secondary">
                Hoppa över
              </Button>
              <Button onClick={handleStep3} disabled={loading}>
                {loading ? "Slutför..." : "Slutför"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OnboardingPage;
