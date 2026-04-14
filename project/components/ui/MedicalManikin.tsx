"use client";

import React, {
  useRef,
  useState,
  useMemo,
  Suspense,
  useEffect,
  useCallback,
} from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  OrbitControls,
  Environment,
  Float,
  Html,
  ContactShadows,
  useGLTF,
} from "@react-three/drei";
import * as THREE from "three";
import {
  BiPulse,
  BiCheckCircle,
  BiTrash,
  BiX,
  BiLoaderAlt,
} from "react-icons/bi";
import Button from "./Button";

interface Note {
  _id?: string;
  id?: string;
  description: string;
  part: string;
  point: { x: number; y: number; z: number };
}

function HighlightMarker({
  note,
  onClick,
}: {
  note: Note;
  onClick: () => void;
}) {
  const point = useMemo(
    () => new THREE.Vector3(note.point.x, note.point.y, note.point.z),
    [note.point],
  );

  return (
    <Html position={point} center zIndexRange={[100, 0]}>
      <div
        className="group relative flex flex-col items-center justify-center cursor-pointer pointer-events-auto"
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      >
        <div className="w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-[0_0_10px_rgba(239,68,68,0.6)] flex items-center justify-center transition-transform duration-300 group-hover:scale-125 z-20">
          <div className="w-1.5 h-1.5 bg-white rounded-full flex items-center justify-center">
            <div className="w-4 h-4 rounded-full border border-red-500 animate-ping opacity-50 absolute" />
          </div>
        </div>

        <div className="absolute top-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none flex flex-col items-center z-50">
          <div
            style={{ padding: "10px" }}
            className="bg-primary text-white text-xs px-3 py-2 rounded-lg whitespace-normal min-w-[140px] max-w-[200px] shadow-xl"
          >
            <div className="text-[9px] font-black uppercase text-amber-400 tracking-widest mb-1.5 border-b border-white/10 pb-1">
              {note.part || "Surface Mapping"}
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

function Model({
  url,
  bmiScale,
  onClick,
  readOnly,
}: {
  url: string;
  bmiScale: { x: number; y: number };
  onClick: (name: string, point: THREE.Vector3) => void;
  readOnly?: boolean;
}) {
  const { scene } = useGLTF(url);
  const group = useRef<THREE.Group>(null);

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

  return (
    <primitive
      ref={group}
      object={scene}
      scale={[bmiScale.x * 0.8, bmiScale.y * 0.8, bmiScale.x * 0.8]}
      position={[0, 1.0, 0]}
      onClick={(e: any) => {
        if (readOnly) return;
        e.stopPropagation();
        const partName = e.object.name || "Surface Mapping";
        onClick(partName, e.point);
      }}
    />
  );
}

interface MedicalManikinProps {
  gender: "male" | "female";
  heightCm: number;
  weightKg: number;
  readOnly?: boolean;
  patientId?: string; // Optional — for practitioners viewing a specific patient
}

export default function MedicalManikin({
  gender,
  heightCm,
  weightKg,
  readOnly = false,
  patientId,
}: MedicalManikinProps) {
  const [activePart, setActivePart] = useState<{
    name: string;
    point: THREE.Vector3;
  } | null>(null);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [description, setDescription] = useState("");
  const [customPartName, setCustomPartName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const bmi = useMemo(() => {
    const heightM = heightCm / 100;
    return weightKg / (heightM * heightM);
  }, [heightCm, weightKg]);

  const bmiScale = useMemo(
    () => ({
      x: Math.max(0.8, Math.min(1.4, bmi / 22)),
      y: Math.max(0.9, Math.min(1.1, heightCm / 175)),
    }),
    [bmi, heightCm],
  );

  const fetchAnnotations = useCallback(async () => {
    setIsLoading(true);
    try {
      const url = patientId
        ? `/api/patient/annotations?patientId=${patientId}`
        : "/api/patient/annotations";
      const res = await fetch(url);
      if (res.ok) setNotes(await res.json());
    } catch {
      /* silent */
    }
    setIsLoading(false);
  }, [patientId]);

  useEffect(() => {
    fetchAnnotations();
  }, [fetchAnnotations]);

  const handlePartClick = (name: string, point: THREE.Vector3) => {
    if (readOnly) return;
    setActivePart({ name, point });
    setCustomPartName(name);
    setDescription("");
  };

  const handleSave = async () => {
    if (!description.trim()) return;
    setIsSaving(true);
    try {
      if (editingNote) {
        // Update
        const id = editingNote._id || editingNote.id;
        const res = await fetch(`/api/patient/annotations/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ description, part: customPartName }),
        });
        if (res.ok) {
          const updated = await res.json();
          setNotes((prev) =>
            prev.map((n) =>
              (n._id || n.id) === (updated._id || updated.id) ? updated : n,
            ),
          );
        }
      } else if (activePart) {
        // Create
        const res = await fetch("/api/patient/annotations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            description,
            part: customPartName,
            point: {
              x: activePart.point.x,
              y: activePart.point.y,
              z: activePart.point.z,
            },
            patientId, // If provided by practitioner
          }),
        });
        if (res.ok) {
          const created = await res.json();
          setNotes((prev) => [...prev, created]);
        }
      }
    } catch {
      /* silent */
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
      const res = await fetch(`/api/patient/annotations/${id}`, {
        method: "DELETE",
      });
      if (res.ok)
        setNotes((prev) => prev.filter((n) => (n._id || n.id) !== id));
    } catch {
      /* silent */
    }
    setIsSaving(false);
    setActivePart(null);
    setEditingNote(null);
  };

  return (
    <div className="w-full h-[600px] ">
      {/* HUD Metrics */}
      <div>
        <div className="mb-4">
          <p className="text-lg font-bold text-slate-800 ">My Digital Twin</p>
          <p className="text-xs font-thin text-slate-400 ">
            Click, annotate, and explore the living 3D reflection of you.
          </p>
        </div>
      </div>
      <div className="flex h-full relative group bg-linear-to-b from-slate-50 to-white rounded-xl overflow-hidden select-none">
        <div className="absolute top-3 left-3 z-30 pointer-events-none">
          <div className="space-y-4">
            <div className="flex items-baseline gap-2">
              <h4 className="text-4xl font-bold text-primary tracking-tighter leading-none">
                87%
              </h4>
              <span className="text-[10px] font-bold text-slate-400 uppercase ">
                Medical Accuracy
              </span>
            </div>
            <div className="flex gap-2">
              <div className="bg-slate-900 text-white px-3 py-2 rounded-full text-[10px] font-black uppercase tracking-wider">
                BMI: {bmi.toFixed(1)}
              </div>
              <div className="bg-primary text-white px-3 py-2 rounded-full text-[10px] font-black uppercase tracking-wider">
                {heightCm}cm / {weightKg}kg
              </div>
            </div>
          </div>
        </div>

        {/* Connection Indicator */}
        <div className="absolute top-3 right-3 z-30 pointer-events-none flex flex-col items-end gap-1">
          <div className="text-3xl  text-primary leading-none">
            {notes.length}
          </div>
          <p className="text-sm font-semibold text-slate-400 ">
            {readOnly ? "Clinical Mapping" : "Active Mapping"}
          </p>
        </div>

        <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 0, 8], fov: 40 }}>
          <ambientLight intensity={0.4} />
          <spotLight
            position={[10, 10, 10]}
            angle={0.15}
            penumbra={1}
            intensity={1.2}
            castShadow
          />
          <gridHelper
            args={[20, 40, "#cbd5e1", "#f1f5f9"]}
            position={[0, -2.5, -2]}
            rotation={[Math.PI / 2, 0, 0]}
          />

          <Suspense
            fallback={
              <Html center>
                <div className="flex flex-col items-center gap-6">
                  <div className="w-16 h-16 border-[6px] border-primary border-t-transparent rounded-full animate-spin" />
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
                    Syncing Neural Data...
                  </p>
                </div>
              </Html>
            }
          >
            <Float speed={1} rotationIntensity={0.05} floatIntensity={0.1}>
              <group>
                <Model
                  url="/human_glb.glb"
                  bmiScale={bmiScale}
                  onClick={handlePartClick}
                  readOnly={readOnly}
                />
                {notes.map((note) => (
                  <HighlightMarker
                    key={note._id || note.id}
                    note={note}
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
          <Environment preset="studio" />
        </Canvas>

        {/* ANNOTATION MODAL */}
        {(activePart || editingNote) && (
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-8 z-[100] animate-in fade-in duration-500">
            <div className="bg-white rounded-lg border border-slate-200  p-6 w-full max-w-lg relative overflow-hidden">
              {/* Visual background hint */}

              <div className="relative z-10">
                <div className="flex justify-between items-center mb-8">
                  <div className="flex items-center gap-3 px-4 py-1.5 rounded-full">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    <span className="text-[10px]  text-primary uppercase tracking-widest">
                      Neural Mapping Node
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {editingNote && !readOnly && (
                      <button
                        onClick={handleDelete}
                        disabled={isSaving}
                        className="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-sm"
                      >
                        <BiTrash size={18} />
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setActivePart(null);
                        setEditingNote(null);
                      }}
                      className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-slate-100 shadow-sm"
                    >
                      <BiX size={24} />
                    </button>
                  </div>
                </div>

                <div className="space-y-1 mb-8">
                  <input
                    type="text"
                    value={customPartName}
                    onChange={(e) => setCustomPartName(e.target.value)}
                    placeholder="Region ID (e.g. Left Forearm)"
                    disabled={readOnly}
                    className="text-3xl font-black text-slate-800 tracking-tighter uppercase block w-full bg-transparent border-none outline-none focus:ring-0 placeholder:text-slate-200"
                  />
                  <p className="text-xs font-bold text-slate-400 max-w-sm tracking-tight leading-relaxed">
                    {readOnly
                      ? "Patient clinical observation for this specific anatomical node."
                      : "Synchronize clinical observations, sensation intensity, and duration details with your care team."}
                  </p>
                </div>

                {readOnly ? (
                  <div className="w-full bg-slate-50 border border-slate-100 rounded-3xl p-8 py-10 mb-8 min-h-[140px]">
                    <p className="text-sm font-bold text-slate-700 leading-relaxed italic">
                      "{description}"
                    </p>
                  </div>
                ) : (
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-8 py-10 text-sm font-base text-slate-700 outline-none focus:border-primary focus:bg-white transition-all  mb-8 resize-none min-h-[140px] placeholder:text-slate-400"
                    placeholder="Describe sensation, pain levels, or injury details here..."
                    autoFocus
                  />
                )}

                {!readOnly && (
                  <div className="flex gap-4">
                    <Button
                      onClick={() => {
                        setActivePart(null);
                        setEditingNote(null);
                      }}
                      size="sm"
                      variant="outline"
                      className="text-xs font-bold"
                    >
                      ABANDON SYNC
                    </Button>
                    <Button
                      onClick={handleSave}
                      disabled={isSaving || !description.trim()}
                      size="sm"
                      variant="primary"
                      className="text-xs font-bold"
                    >
                      {isSaving ? (
                        <BiLoaderAlt size={16} className="animate-spin" />
                      ) : (
                        <div></div>
                      )}
                      {editingNote ? "SYNC EDIT" : "COMMIT NODE"}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Legend / Hints */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30">
          <div className="flex gap-4 items-center bg-white  px-8 py-2 rounded-full  transition-all duration-500 ease-out hover:bg-slate-900 group">
            <span className="text-[10px] whitespace-nowrap font-bold text-slate-400  group-hover:text-white transition-colors">
              Orbit & Zoom to Map Nervous System Nodes
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Preload for zero-latency loading
useGLTF.preload("/human_glb.glb");
