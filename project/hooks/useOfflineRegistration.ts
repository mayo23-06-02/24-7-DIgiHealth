"use client";
import { useState, useEffect } from "react";
import localForage from "localforage";

/**
 * Custom hook to handle offline persistence of registration drafts.
 * Saves to IndexedDB on every change and attempts to restore on mount.
 */
export function useOfflineRegistration(role: string, initialData: any) {
  const [formData, setFormData] = useState(initialData);
  const [currentStep, setCurrentStep] = useState(1);
  const [isRestored, setIsRestored] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);

  const STORAGE_KEY = `registration_draft_${role.toLowerCase()}`;

  // Initialize LocalForage
  useEffect(() => {
    localForage.config({
      name: "24-7-DigiHealth",
      storeName: "registration_drafts"
    });
  }, []);

  // Save progress periodically (debounced or on every change)
  useEffect(() => {
    if (!isRestored) return;
    const saveToDraft = async () => {
      try {
        await localForage.setItem(STORAGE_KEY, { formData, currentStep, lastUpdated: Date.now() });
      } catch (err) {
        console.error("Draft persistence failed.", err);
      }
    };
    saveToDraft();
  }, [formData, currentStep, isRestored, STORAGE_KEY]);

  // Load progress on mount
  useEffect(() => {
    const checkDraft = async () => {
      try {
        const draft: any = await localForage.getItem(STORAGE_KEY);
        if (draft && draft.formData) {
          setHasDraft(true);
        } else {
          setIsRestored(true); // No draft found, start clean
        }
      } catch (err) {
        setIsRestored(true);
      }
    };
    checkDraft();
  }, [STORAGE_KEY]);

  const restoreDraft = async () => {
    const draft: any = await localForage.getItem(STORAGE_KEY);
    if (draft) {
      setFormData(draft.formData);
      setCurrentStep(draft.currentStep || 1);
    }
    setIsRestored(true);
    setHasDraft(false);
  };

  const clearDraft = async () => {
    await localForage.removeItem(STORAGE_KEY);
    setIsRestored(true);
    setHasDraft(false);
  };

  return { 
    formData, 
    setFormData, 
    currentStep, 
    setCurrentStep, 
    hasDraft, 
    restoreDraft, 
    clearDraft,
    isRestored 
  };
}
