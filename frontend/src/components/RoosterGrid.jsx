import { useState, useRef, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';

const DAGEN = [
  { nr: 1, naam: 'Maandag' },
  { nr: 2, naam: 'Dinsdag' },
  { nr: 3, naam: 'Woensdag' },
  { nr: 4, naam: 'Donderdag' },
  { nr: 5, naam: 'Vrijdag' },
];

const UREN = [1, 2, 3, 4, 5, 6, 7, 8];

// KlassenPopup: toont lijst van klassen + leerlingen in een popup
function KlassenPopup({ klassen, leerlingenLijst, onSluit }) {
  const ref = useRef(null);
  useEffect(() => {
    function onClick(e) { if (ref.current && !ref.current.contains(e.target)) onSluit(); }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [onSluit]);

  return (
    <div ref={ref} className="absolute z-50 left-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl p-3 w-52">
      <p className="text-xs font-semibold text-slate-700 mb-1">Klassen ({klassen.length})</p>
      <div className="flex flex-wrap gap-1 mb-2">
        {klassen.map(k => (
          <span key={k} className="bg-blue-100 text-blue-800 text-xs px-1.5 py-0.5 rounded">{k}</span>
        ))}
      </div>
      {leerlingenLijst.length > 0 && (
        <>
          <p className="text-xs font-semibold text-slate-700 mb-1">Leerlingen ({leerlingenLijst.length})</p>
          <div className="max-h-36 overflow-y-auto flex flex-col gap-0.5">
            {leerlingenLijst.map((naam, i) => (
              <p key={i} className="text-xs text-slate-500 truncate">{naam}</p>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// SlotKaart: één les/toets in het rooster
function SlotKaart({ slot, heeftConflict, isDragging }) {
  const [toonPopup, setToonPopup] = useState(false);

  const vak    = slot.vakCode          || slot.vak?.code          || '?';
  const docent = slot.docentAfkorting  || slot.docent?.afkorting  || '—';
  const lokaal = slot.lokaalCode       || slot.lokaal?.code       || '—';
  const klassen = slot.klassen || (slot.klasNaam && slot.klasNaam !== '—' ? [slot.klasNaam] : []);
  const leerlingenLijst = slot.leerlingenLijst || [];

  let klasDisplay;
  if (klassen.length === 0) {
    klasDisplay = <span>—</span>;
  } else if (klassen.length === 1) {
    klasDisplay = <span>{klassen[0]}</span>;
  } else {
    klasDisplay = (
      <button
        className="text-blue-600 underline leading-none"
        onPointerDown={e => e.stopPropagation()}
        onClick={e => { e.stopPropagation(); setToonPopup(p => !p); }}
      >
        {klassen.length} klassen
      </button>
    );
  }

  return (
    <div className={`
      relative p-1.5 rounded text-xs cursor-grab active:cursor-grabbing select-none
      ${heeftConflict
        ? 'bg-red-100 border-2 border-red-400 text-red-800'
        : 'bg-blue-50 border border-blue-200 text-blue-900'}
      ${isDragging ? 'opacity-50' : ''}
    `}>
      <p className="font-semibold truncate mb-1">{vak}</p>
      <p className="truncate text-slate-500"><span className="text-slate-400">Doc  </span>{docent}</p>
      <p className="truncate text-slate-500"><span className="text-slate-400">Klas </span>{klasDisplay}</p>
      <p className="truncate text-slate-500"><span className="text-slate-400">Lok  </span>{lokaal}</p>
      {heeftConflict && <p className="text-red-600 font-medium mt-0.5">⚠ conflict</p>}
      {toonPopup && (
        <KlassenPopup klassen={klassen} leerlingenLijst={leerlingenLijst} onSluit={() => setToonPopup(false)} />
      )}
    </div>
  );
}

// Draggable wrapper
function DraggableSlot({ id, slot, heeftConflict }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: String(id) });

  return (
    <div ref={setNodeRef} {...listeners} {...attributes}>
      <SlotKaart slot={slot} heeftConflict={heeftConflict} isDragging={isDragging} />
    </div>
  );
}

// Drop zone voor een cel
function DropZone({ dag, uur, children }) {
  const id = `cel-${dag}-${uur}`;
  const { isOver, setNodeRef } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`min-h-14 p-1 border-r border-b border-slate-100 transition-colors flex flex-col gap-1
        ${isOver ? 'bg-blue-50' : 'bg-white'}`}
    >
      {children}
    </div>
  );
}

// Hoofdcomponent
export default function RoosterGrid({ slots = [], onSlotVerplaats, conflictenMap = {} }) {
  const [actieveSlot, setActieveSlot] = useState(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function getSlotsVoorCel(dag, uur) {
    return slots.filter(s => s.dag === dag && s.uur === uur);
  }

  function handleDragStart(event) {
    const slotId = parseInt(event.active.id);
    const slot = slots.find(s => s.id === slotId);
    setActieveSlot(slot);
  }

  function handleDragEnd(event) {
    setActieveSlot(null);
    const { over } = event;
    if (!over) return;

    const slotId = parseInt(event.active.id);
    const [, dag, uur] = over.id.split('-').map((v, i) => i === 0 ? v : parseInt(v));

    if (!dag || !uur) return;

    const slot = slots.find(s => s.id === slotId);
    if (slot && (slot.dag !== dag || slot.uur !== uur)) {
      onSlotVerplaats?.(slotId, dag, uur);
    }
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="overflow-auto">
        <div className="min-w-max">
          {/* Header */}
          <div className="grid" style={{ gridTemplateColumns: '3rem repeat(5, 1fr)' }}>
            <div className="border-r border-b border-slate-200 bg-slate-50" />
            {DAGEN.map(dag => (
              <div key={dag.nr} className="border-r border-b border-slate-200 bg-slate-50 px-2 py-1.5 text-xs font-semibold text-slate-600 text-center">
                {dag.naam}
              </div>
            ))}
          </div>

          {/* Rijen */}
          {UREN.map(uur => (
            <div key={uur} className="grid" style={{ gridTemplateColumns: '3rem repeat(5, 1fr)' }}>
              <div className="border-r border-b border-slate-100 bg-slate-50 flex items-center justify-center text-xs text-slate-400 font-medium">
                {uur}
              </div>
              {DAGEN.map(dag => (
                <DropZone key={`${dag.nr}-${uur}`} dag={dag.nr} uur={uur}>
                  {getSlotsVoorCel(dag.nr, uur).map(slot => (
                    <DraggableSlot
                      key={slot.id}
                      id={slot.id}
                      slot={slot}
                      heeftConflict={!!(conflictenMap[slot.id]?.length)}
                    />
                  ))}
                </DropZone>
              ))}
            </div>
          ))}
        </div>
      </div>

      <DragOverlay>
        {actieveSlot && <SlotKaart slot={actieveSlot} heeftConflict={false} />}
      </DragOverlay>
    </DndContext>
  );
}
