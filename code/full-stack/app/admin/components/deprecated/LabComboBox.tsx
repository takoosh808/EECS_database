// import { useEffect, useState } from "react";
// import { Lab } from "../../types";

// interface Props {
//   value: string; // lab_id
//   onChange: (labId: string) => void;
// }

// export default function LabCombobox({ value, onChange }: Props) {
//   const [labs, setLabs] = useState<Lab[]>([]);
//   const [query, setQuery] = useState("");
//   const [open, setOpen] = useState(false);

//   useEffect(() => {
//     const loadLabs = async () => {
//       const res = await fetch("/api/labs/get");
//       const data: Lab[] = await res.json();
//       setLabs(data);
//     };
//     loadLabs();
//   }, []);

//   const filtered = labs.filter((lab) =>
//     lab.name.toLowerCase().includes(query.toLowerCase()),
//   );
//   const exactMatch = labs.some(
//     (lab) => lab.name.toLowerCase() === query.toLowerCase(),
//   );

//   const selectLab = (lab: Lab) => {
//     setQuery(lab.name);
//     onChange(lab.id);
//     setOpen(false);
//   };

//   const createLab = async () => {
//     const res = await fetch("/api/labs/create", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ name: query }),
//     });

//     const newLab: Lab = await res.json();

//     setLabs((prev) => [...prev, newLab]);
//     setQuery(newLab.name);
//     onChange(newLab.id);
//     setOpen(false);
//   };

//   useEffect(() => {
//     if (!value) {
//       setQuery("");
//       return;
//     }

//     const selected = labs.find((l) => String(l.id) === String(value));

//     setQuery(selected ? selected.name : "");
//   }, [value, labs]);

//   return (
//     <div className="relative w-full">
//       {/* input box */}
//       <div className="border border-gray-200 rounded-md">
//         <input
//           className="w-full p-2 rounded-md outline-none"
//           value={query}
//           placeholder="Search or create lab"
//           onChange={(e) => {
//             setQuery(e.target.value);
//             setOpen(true);

//             setQuery(e.target.value);
//             setOpen(true);
//           }}
//           onFocus={() => setOpen(true)}
//         />
//       </div>

//       {/* dropdown */}
//       {open && query && (
//         <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-md shadow-md z-10">
//           {filtered.map((lab) => (
//             <div
//               key={lab.id}
//               onClick={() => selectLab(lab)}
//               className="p-2 cursor-pointer hover:bg-gray-100"
//             >
//               {lab.name}
//             </div>
//           ))}

//           {!exactMatch && query && (
//             <div
//               onClick={createLab}
//               className="p-2 cursor-pointer font-semibold border-t border-gray-200 hover:bg-gray-100"
//             >
//               Create "{query}"
//             </div>
//           )}
//         </div>
//       )}
//     </div>
//   );
// }
