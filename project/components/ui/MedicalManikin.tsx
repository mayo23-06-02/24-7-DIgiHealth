"use client";

import React, {
  useRef,
  useState,
  useMemo,
  Suspense,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  OrbitControls,
  Float,
  Html,
  ContactShadows,
  useGLTF,
} from "@react-three/drei";
import * as THREE from "three";
import {
  BiTrash,
  BiX,
  BiLoaderAlt,
} from "react-icons/bi";
import Button from "./Button";

// ==================== TYPES ====================
interface Note {
  _id?: string;
  id?: string;
  description: string;
  part: string;
  point: { x: number; y: number; z: number };
  createdAt?: string | Date;
}

export type ManikinAgeGroup = "infant" | "child" | "adult";

const ANATOMY_PARTS = [
  "Head", "Scalp", "Face", "Forehead", "Temple", "Eye (left)", "Eye (right)",
  "Ear (left)", "Ear (right)", "Nose", "Cheek (left)", "Cheek (right)", "Jaw",
  "Chin", "Neck (anterior)", "Neck (posterior)", "Throat", "Cervical spine",
  "Chest", "Sternum", "Rib cage", "Breast (left)", "Breast (right)",
  "Axilla (left)", "Axilla (right)", "Abdomen (upper)", "Abdomen (lower)",
  "Navel", "Flank (left)", "Flank (right)", "Lumbar spine", "Thoracic spine",
  "Upper back", "Mid back", "Lower back", "Shoulder blade (left)", "Shoulder blade (right)",
  "Sacrum", "Coccyx", "Shoulder (left)", "Shoulder (right)", "Arm (left) – upper",
  "Arm (right) – upper", "Elbow (left)", "Elbow (right)", "Forearm (left)",
  "Forearm (right)", "Wrist (left)", "Wrist (right)", "Hand (left)", "Hand (right)",
  "Finger (left) – specify", "Finger (right) – specify", "Hip (left)", "Hip (right)",
  "Groin", "Buttock (left)", "Buttock (right)", "Thigh (left) – anterior",
  "Thigh (right) – anterior", "Thigh (left) – posterior", "Thigh (right) – posterior",
  "Knee (left)", "Knee (right)", "Calf (left)", "Calf (right)", "Shin (left)",
  "Shin (right)", "Ankle (left)", "Ankle (right)", "Foot (left)", "Foot (right)",
  "Toe (left) – specify", "Toe (right) – specify", "Brain", "Spinal cord",
  "Heart", "Lungs (left)", "Lungs (right)", "Trachea", "Esophagus", "Liver",
  "Gallbladder", "Stomach", "Pancreas", "Spleen", "Kidney (left)", "Kidney (right)",
  "Small intestine", "Large intestine", "Appendix", "Bladder", "Uterus",
  "Ovary (left)", "Ovary (right)", "Prostate", "Blood vessel", "Lymph node",
  "Bone – specify", "Joint – specify", "Muscle – specify",
];

const MANIKIN_MODEL_PATHS: Record<ManikinAgeGroup, { male: string; female: string } | { unisex: string }> = {
  adult: { male: "/human_glb.glb", female: "/female.glb" },
  child: { unisex: "/child.glb" },
  infant: { unisex: "/infant.glb" },
};

interface MedicalManikinProps {
  gender: "male" | "female";
  heightCm: number;
  weightKg: number;
  ageGroup?: ManikinAgeGroup;
  ageRange?: '0-2' | '3-5' | '5-12' | '13-18';
  dateOfBirth?: Date | string;
  readOnly?: boolean;
  patientId?: string;
  onUpdateHeightWeight?: () => void;
}

export type MedicalManikinHandle = {
  captureSnapshot: () => string | null;
  getAnnotations: () => Array<Note & { citationNumber: number }>;
};

function GlCaptureBridge({ onReady }: { onReady: (gl: THREE.WebGLRenderer) => void }) {
  const { gl } = useThree();
  useEffect(() => {
    onReady(gl);
  }, [gl, onReady]);
  return null;
}

function HighlightMarker({ note, index, onClick }: { note: Note; index: number; onClick: () => void }) {
  const point = useMemo(
    () => new THREE.Vector3(note.point.x, note.point.y, note.point.z),
    [note.point],
  );
  return (
    <Html position={point} center zIndexRange={[100, 0]}>
      <div
        className="group relative flex flex-col items-center justify-center cursor-pointer pointer-events-auto"
        onClick={(e) => { e.stopPropagation(); onClick(); }}
      >
        <div className="w-6 h-6 bg-red-500 rounded-full border-2 border-white shadow-[0_0_10px_rgba(239,68,68,0.6)] flex items-center justify-center transition-transform duration-300 group-hover:scale-125 z-20 text-[10px] font-bold text-white">
          {index}
          <div className="w-6 h-6 rounded-full border border-red-500 animate-ping opacity-40 absolute" />
        </div>
        <div className="absolute top-7 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none flex flex-col items-center z-50">
          <div className="bg-primary text-white text-xs px-3 py-2 rounded-lg whitespace-normal min-w-[140px] max-w-[200px] shadow-none">
            <div className="text-[9px] font-bold text-gray-300 tracking-normal mb-1.5 border-b border-white/10 pb-1">
              [{index}] {note.part || "Surface Mapping"}
            </div>
            <div className="font-medium text-slate-50 leading-relaxed break-words">
              {note.description || "No observation recorded."}
            </div>
          </div>
        </div>
      </div>
    </Html>
  );
}

type ModelVariant = "adult-male" | "adult-female" | "child" | "infant";

const MODEL_CALIBRATION: Record<
  ModelVariant,
  { scale: (b: { x: number; y: number }) => [number, number, number]; position: [number, number, number] }
> = {
  "adult-female": { scale: (b) => [b.x * 1.4, b.y * 1.4, b.x * 1.4], position: [0, -2.8, 0] },
  "adult-male": { scale: (b) => [b.x * 0.7, b.y * 0.8, b.x * 0.8], position: [0, 1.0, 0] },
  child: { scale: (b) => [b.x * 0.6, b.y * 0.6, b.x * 0.6], position: [0, 0.5, 0] },
  infant: { scale: () => [0.5, 0.6, 0.5], position: [0, -0.5, 0] },
};

function Model({ url, bmiScale, onClick, readOnly, variant }: {
  url: string;
  bmiScale: { x: number; y: number };
  onClick: (name: string, point: THREE.Vector3) => void;
  readOnly?: boolean;
  variant: ModelVariant;
}) {
  const { scene } = useGLTF(url);
  const group = useRef<THREE.Group>(null);

  // 👇 COLOUR ENFORCED HERE – all models get #4493b8
  useMemo(() => {
    scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.material = new THREE.MeshStandardMaterial({
          color: "#4493b8",
          roughness: 0.3,
          metalness: 0.1,
        });
      }
    });
  }, [scene]);

  useFrame((state) => {
    if (group.current) {
      const targetRotationY = state.mouse.x * 0.4;
      group.current.rotation.y = THREE.MathUtils.lerp(
        group.current.rotation.y,
        targetRotationY,
        0.05,
      );
    }
  });

  const calibration = MODEL_CALIBRATION[variant];

  return (
    <primitive
      ref={group}
      object={scene}
      scale={calibration.scale(bmiScale)}
      position={calibration.position}
      onClick={(e: any) => {
        if (readOnly) return;
        e.stopPropagation();
        const rawName = e.object.name || "Surface Mapping";
        let friendlyName = rawName;
        const matched = ANATOMY_PARTS.find((p) =>
          rawName.toLowerCase().includes(p.toLowerCase()),
        );
        if (matched) friendlyName = matched;
        onClick(friendlyName, e.point);
      }}
    />
  );
}

const MedicalManikin = forwardRef<MedicalManikinHandle, MedicalManikinProps>(
  function MedicalManikin(
    {
      gender: rawGender,
      heightCm,
      weightKg,
      ageGroup: propAgeGroup,
      ageRange,
      dateOfBirth,
      readOnly = false,
      patientId,
      onUpdateHeightWeight,
    },
    ref,
  ) {
    const [activePart, setActivePart] = useState<{ name: string; point: THREE.Vector3 } | null>(null);
    const [editingNote, setEditingNote] = useState<Note | null>(null);
    const [notes, setNotes] = useState<Note[]>([]);
    const [description, setDescription] = useState("");
    const [customPartName, setCustomPartName] = useState("Select name of body part placeholder");
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const glRef = useRef<THREE.WebGLRenderer | null>(null);

    const orderedNotes = useMemo(() => {
      return [...notes].sort((a, b) => {
        const ta = (a as any).createdAt ? new Date((a as any).createdAt).getTime() : 0;
        const tb = (b as any).createdAt ? new Date((b as any).createdAt).getTime() : 0;
        return ta - tb;
      });
    }, [notes]);

    const handleGlReady = useCallback((gl: THREE.WebGLRenderer) => {
      glRef.current = gl;
    }, []);

    useImperativeHandle(ref, () => ({
      captureSnapshot: () => {
        try {
          const gl = glRef.current;
          if (!gl?.domElement) return null;
          return gl.domElement.toDataURL("image/png");
        } catch (e) {
          console.warn("[MedicalManikin] capture failed", e);
          return null;
        }
      },
      getAnnotations: () => orderedNotes.map((n, i) => ({ ...n, citationNumber: i + 1 })),
    }), [orderedNotes]);

    const gender = rawGender.toLowerCase() === "female" ? "female" : "male";

    const ageGroup = useMemo(() => {
      if (propAgeGroup && propAgeGroup !== "adult") return propAgeGroup;
      if (ageRange === "0-2" || ageRange === "3-5") return "infant";
      if (ageRange === "5-12" || ageRange === "13-18") return "child";
      if (dateOfBirth) {
        const dob = new Date(dateOfBirth);
        const now = new Date();
        let age = now.getFullYear() - dob.getFullYear();
        const m = now.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
        if (age < 10) return "infant";
        if (age >= 10 && age <= 18) return "child";
      }
      return "adult";
    }, [propAgeGroup, ageRange, dateOfBirth]);

    const modelUrl = useMemo(() => {
      const paths = MANIKIN_MODEL_PATHS[ageGroup];
      if ("unisex" in paths) return paths.unisex;
      return gender === "female" ? paths.female : paths.male;
    }, [ageGroup, gender]);

    const modelVariant: ModelVariant = useMemo(() => {
      if (ageGroup === "child") return "child";
      if (ageGroup === "infant") return "infant";
      return gender === "female" ? "adult-female" : "adult-male";
    }, [ageGroup, gender]);

    useEffect(() => {
      useGLTF.preload("/human_glb.glb");
      useGLTF.preload("/female.glb");
      useGLTF.preload("/infant.glb");
      useGLTF.preload("/child.glb");
    }, []);

    const bmi = useMemo(() => {
      if (heightCm === 0 || weightKg === 0) return 0;
      const heightM = heightCm / 100;
      return weightKg / (heightM * heightM);
    }, [heightCm, weightKg]);

    const bmiScale = useMemo(() => {
      if (heightCm === 0 || weightKg === 0) return { x: 1, y: 1 };
      return {
        x: Math.max(0.8, Math.min(1.4, bmi / 22)),
        y: Math.max(0.9, Math.min(1.1, heightCm / 175)),
      };
    }, [bmi, heightCm, weightKg]);

    const fetchAnnotations = useCallback(async () => {
      setIsLoading(true);
      try {
        const url = patientId ? `/api/patient/annotations?patientId=${patientId}` : "/api/patient/annotations";
        const res = await fetch(url);
        if (res.ok) setNotes(await res.json());
      } catch (error) {
        console.error("Failed to fetch annotations", error);
      }
      setIsLoading(false);
    }, [patientId]);

    useEffect(() => {
      fetchAnnotations();
    }, [fetchAnnotations]);

    const handlePartClick = (name: string, point: THREE.Vector3) => {
      if (readOnly) return;
      setActivePart({ name, point });
      setCustomPartName("Select name of body part placeholder");
      setDescription("");
    };

    const handleSave = async () => {
      if (!description.trim()) return;
      setIsSaving(true);
      try {
        if (editingNote) {
          const id = editingNote._id || editingNote.id;
          const res = await fetch(`/api/patient/annotations/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ description, part: customPartName }),
          });
          if (res.ok) {
            const updated = await res.json();
            setNotes((prev) => prev.map((n) => (n._id || n.id) === (updated._id || updated.id) ? updated : n));
          }
        } else if (activePart) {
          const res = await fetch("/api/patient/annotations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              description,
              part: customPartName,
              point: { x: activePart.point.x, y: activePart.point.y, z: activePart.point.z },
              patientId,
            }),
          });
          if (res.ok) {
            const created = await res.json();
            setNotes((prev) => [...prev, created]);
          }
        }
      } catch (error) {
        console.error("Save failed", error);
      }
      setIsSaving(false);
      setActivePart(null);
      setEditingNote(null);
    };

    const handleDelete = async () => {
      if (!editingNote || readOnly) return;
      const id = editingNote._id || editingNote.id;
      setIsSaving(true);
      try {
        const res = await fetch(`/api/patient/annotations/${id}`, { method: "DELETE" });
        if (res.ok) setNotes((prev) => prev.filter((n) => (n._id || n.id) !== id));
      } catch (error) {
        console.error("Delete failed", error);
      }
      setIsSaving(false);
      setActivePart(null);
      setEditingNote(null);
    };

    if (isLoading) {
      return (
        <div className="w-full h-[700px] flex items-center justify-center bg-slate-50 rounded-lg">
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-slate-500">Loading 3D model...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="w-full h-[700px] flex flex-col">
        <div className="mb-4 p-4">
          <h1 className="text-lg font-bold text-slate-800">
            {readOnly ? "Clinical Anatomical Map" : "My Digital Twin"}
          </h1>
          <p className="text-sm lg:text-base font-grotesk text-slate-500">
            {readOnly ? "Interactive mapping of patient symptoms and observations." : "Click, annotate, and explore the living 3D reflection of you."}
          </p>
        </div>

        <div className="flex flex-1 relative group bg-linear-to-b from-slate-50 to-white rounded-lg overflow-hidden select-none">
          <div className="absolute top-5 left-5 z-30 pointer-events-none">
            <div className="space-y-4">
              <div className="flex gap-2">
                <div className="bg-slate-900 text-white px-3 py-2 rounded-full text-xs font-bold tracking-normal">
                  <p>BMI: {bmi.toFixed(1)}</p>
                </div>
                <div className="bg-primary text-white px-3 py-2 rounded-full text-xs font-bold tracking-normal">
                  <p>{heightCm}cm / {weightKg}kg</p>
                </div>
              </div>
            </div>
          </div>

          <div className="absolute top-5 right-5 z-30 pointer-events-none flex flex-col items-end gap-1">
            <p className="text-3xl text-primary leading-none">{notes.length}</p>
            <p className="text-sm font-semibold text-slate-500">
              {readOnly ? "Clinical Mapping" : "Active Mapping"}
            </p>
          </div>

          {(heightCm === 0 || weightKg === 0) && (
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-50 w-[90%]">
              <div className="bg-white/80 backdrop-blur-xl border shadow border-primary/20 rounded-lg p-5 shadow-primary/10 flex items-center gap-4 animate-in slide-in-from-bottom-4 duration-700">
                <div className="flex-1 min-w-0">
                  <h1 className="text-sm font-bold text-slate-900 leading-tight">Incomplete Health Profile</h1>
                  <p className="text-sm text-slate-500 leading-tight mt-0.5">
                    Height and weight are missing. Add them to calibrate your 3D digital twin and BMI accuracy.
                  </p>
                </div>
                {!readOnly && (
                  <Button onClick={onUpdateHeightWeight} variant="primary" size="sm" className="px-3 h-9 text-sm shrink-0">
                    Update Now
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Canvas – no external HDR, reliable lighting */}
          <Canvas
            shadows
            dpr={[1, 2]}
            camera={{ position: [0, 0, 8], fov: 40 }}
            gl={{ preserveDrawingBuffer: true }}
          >
            <GlCaptureBridge onReady={handleGlReady} />

            <ambientLight intensity={0.6} />
            <hemisphereLight intensity={0.8} color="#87ceeb" groundColor="#362d59" />
            <directionalLight position={[5, 10, 7]} intensity={4.2} castShadow />
            <directionalLight position={[-5, 3, -5]} intensity={3.5} />

            <Suspense
              fallback={
                <group>
                  <mesh position={[0, 0, 0]}>
                    <sphereGeometry args={[0.8, 16, 16]} />
                    <meshStandardMaterial color="#4493b8" wireframe />
                  </mesh>
                </group>
              }
            >
              <Float speed={1} rotationIntensity={0.05} floatIntensity={0.1}>
                <group>
                  <Model
                    url={modelUrl}
                    bmiScale={bmiScale}
                    onClick={handlePartClick}
                    readOnly={readOnly}
                    variant={modelVariant}
                  />
                  {orderedNotes.map((note, i) => (
                    <HighlightMarker
                      key={note._id || note.id}
                      note={note}
                      index={i + 1}
                      onClick={() => {
                        setEditingNote(note);
                        setCustomPartName(note.part);
                        setDescription(note.description);
                      }}
                    />
                  ))}
                </group>
              </Float>
            </Suspense>

            <ContactShadows
              position={[0, -2.5, 0]}
              opacity={0.2}
              scale={15}
              blur={3}
              far={10}
              color="#0052CC"
            />
            <OrbitControls
              enableZoom={true}
              minPolarAngle={Math.PI / 3}
              maxPolarAngle={Math.PI / 1.8}
              enablePan={false}
              minDistance={5}
              maxDistance={18}
              target={[0, 0, 0]}
              makeDefault
            />
          </Canvas>

          {(activePart || editingNote) && (
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-8 z-[100] animate-in fade-in duration-500">
              <div className="bg-white rounded-lg border border-slate-200 p-6 w-full max-w-lg relative overflow-hidden">
                <div className="relative z-10">
                  <div className="flex justify-between items-center mb-8">
                    <div className="flex items-center gap-3 px-4 py-2 rounded-full">
                      <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                      <span className="text-xs text-primary tracking-normal">Neural Mapping Node</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {editingNote && !readOnly && (
                        <button
                          onClick={handleDelete}
                          disabled={isSaving}
                          className="w-10 h-10 rounded-lg bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-none"
                        >
                          <BiTrash size={18} />
                        </button>
                      )}
                      <button
                        onClick={() => { setActivePart(null); setEditingNote(null); }}
                        className="w-10 h-10 rounded-lg bg-slate-50 text-slate-500 flex items-center justify-center hover:bg-slate-100 shadow-none"
                      >
                        <BiX size={24} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1 mb-8">
                    <div className="relative">
                      <input
                        type="text"
                        list="anatomy-parts"
                        value={customPartName}
                        onChange={(e) => setCustomPartName(e.target.value)}
                        placeholder="Select or type body part"
                        disabled={readOnly}
                        className="text-xl font-bold text-slate-500 tracking-tighter block w-full bg-transparent border-b-2 border-slate-200 focus:border-primary outline-none pb-1"
                      />
                      <datalist id="anatomy-parts">
                        {ANATOMY_PARTS.map((part) => (
                          <option key={part} value={part} />
                        ))}
                      </datalist>
                    </div>
                    <p className="text-xs font-bold text-slate-500 max-w-sm tracking-tight leading-relaxed">
                      {readOnly ? "Patient clinical observation for this specific anatomical node." : "Select a standard body part from the list. You may type a custom name if needed (avoid abbreviations)."}
                    </p>
                  </div>

                  {readOnly ? (
                    <div className="w-full bg-slate-50 border border-slate-100 rounded-lg p-8 py-10 mb-8 min-h-[140px]">
                      <p className="text-sm font-bold text-slate-700 leading-relaxed italic">"{description}"</p>
                    </div>
                  ) : (
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-8 py-10 text-sm font-base text-slate-700 outline-none focus:border-primary focus:bg-white transition-all mb-8 resize-none min-h-[140px] placeholder:text-slate-500"
                      placeholder="Describe sensation, pain levels, or injury details here..."
                      autoFocus
                    />
                  )}

                  {!readOnly && (
                    <div className="flex gap-2">
                      <Button onClick={() => { setActivePart(null); setEditingNote(null); }} size="sm" variant="danger">
                        Cancel
                      </Button>
                      <Button onClick={handleSave} disabled={isSaving || !description.trim()} size="sm" variant="primary">
                        {isSaving && <BiLoaderAlt size={16} className="animate-spin" />}
                        {editingNote ? "Update" : "Save"}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30">
            <div className="flex gap-4 items-center bg-white px-8 py-2 rounded-full transition-all duration-500">
              <span className="text-sm whitespace-nowrap text-slate-500">
                Drag/Zoom & click numbered pins to Map Body Nodes
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

export default MedicalManikin;

// Preload all models
useGLTF.preload("/human_glb.glb");
useGLTF.preload("/female.glb");
useGLTF.preload("/infant.glb");
useGLTF.preload("/child.glb");