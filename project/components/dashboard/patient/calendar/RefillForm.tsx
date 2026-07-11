import React from "react";
import {
  BiLoaderAlt,
  BiStore,
  BiSolidTruck,
  BiCheckCircle,
  BiDollar,
} from "react-icons/bi";
import Input from "@/components/ui/Input";

interface Prescription {
  id: string;
  medicationName: string;
  dosage: string;
  refillsRemaining: number;
}

interface RefillFormProps {
  addForm: any;
  setAddForm: (form: any) => void;
  loadingPrescriptions: boolean;
  prescriptionOptions: { value: string; label: string }[];
}

const RefillForm: React.FC<RefillFormProps> = ({
  addForm,
  setAddForm,
  loadingPrescriptions,
  prescriptionOptions,
}) => {
  return (
    <>
      <div className="space-y-2">
        <h1 className="text-xs font-bold text-slate-500 tracking-normal">
          Select Prescription
        </h1>
        {loadingPrescriptions ? (
          <div className="flex items-center gap-2 text-slate-500">
            <BiLoaderAlt className="animate-spin" /> Loading prescriptions...
          </div>
        ) : (
          <select
            value={addForm.prescriptionId}
            onChange={(e) =>
              setAddForm({
                ...addForm,
                prescriptionId: e.target.value,
              })
            }
            className="w-full p-3 rounded-lg border border-slate-200 bg-white focus:border-primary focus:ring-1 focus:ring-primary"
          >
            <option value="">-- Select a prescription --</option>
            {prescriptionOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        )}
      </div>

      {addForm.prescriptionId === "new" && (
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <p className="text-xs font-bold text-gray-700">
            Request new prescription? Please contact your doctor directly or use
            the "Message" feature.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <h1 className="text-xs font-bold text-slate-500 tracking-normal">
            Delivery Method
          </h1>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() =>
                setAddForm({ ...addForm, deliveryMethod: "pickup" })
              }
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border text-xs font-bold transition ${
                addForm.deliveryMethod === "pickup"
                  ? "bg-primary text-white border-primary"
                  : "bg-white text-slate-500 border-slate-200"
              }`}
            >
              <BiStore /> Pickup
            </button>
            <button
              type="button"
              onClick={() =>
                setAddForm({ ...addForm, deliveryMethod: "delivery" })
              }
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border text-xs font-bold transition ${
                addForm.deliveryMethod === "delivery"
                  ? "bg-primary text-white border-primary"
                  : "bg-white text-slate-500 border-slate-200"
              }`}
            >
              <BiSolidTruck /> Delivery
            </button>
          </div>
        </div>

        {addForm.deliveryMethod === "delivery" && (
          <div className="col-span-2">
            <Input
              label="Delivery Address"
              type="text"
              placeholder="Street, city, code"
              value={addForm.deliveryAddress}
              onChange={(e) =>
                setAddForm({
                  ...addForm,
                  deliveryAddress: e.target.value,
                })
              }
            />
          </div>
        )}
      </div>

      <div className="space-y-2">
        <h1 className="text-xs font-bold text-slate-500 tracking-normal">
          Payment Method
        </h1>
        <div className="flex flex-wrap gap-3">
          {[
            {
              value: "insurance",
              label: "Medical Aid",
              icon: <BiCheckCircle />,
            },
            {
              value: "card",
              label: "Credit/Debit Card",
              icon: <BiDollar />,
            },
            {
              value: "cash",
              label: "Cash on Pickup",
              icon: <BiDollar />,
            },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() =>
                setAddForm({
                  ...addForm,
                  paymentMethod: opt.value as any,
                })
              }
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition border ${
                addForm.paymentMethod === opt.value
                  ? "bg-primary text-white border-primary"
                  : "bg-white text-slate-500 border-slate-200"
              }`}
            >
              {opt.icon} {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <h1 className="text-xs font-bold text-slate-500 tracking-normal">
          Remind me in (days)
        </h1>
        <select
          value={addForm.reminderDays}
          onChange={(e) =>
            setAddForm({
              ...addForm,
              reminderDays: parseInt(e.target.value),
            })
          }
          className="w-full p-3 rounded-lg border border-slate-200 bg-white"
        >
          <option value={1}>1 day before</option>
          <option value={2}>2 days before</option>
          <option value={3}>3 days before</option>
          <option value={7}>1 week before</option>
        </select>
      </div>

      <Input
        label="Additional Notes (for pharmacist)"
        textarea
        placeholder="Any special instructions..."
        value={addForm.notes}
        onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })}
      />
    </>
  );
};

export default RefillForm;
