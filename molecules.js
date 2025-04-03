// Reference object for element details
const elementDetails = {
    C: { name: "Carbon", color: 0x000000, group: "Nonmetal", atomicMass: 12.01 },
    O: { name: "Oxygen", color: 0xff3333, group: "Nonmetal", atomicMass: 16.00 },
    H: { name: "Hydrogen", color: 0xffffff, group: "Nonmetal", atomicMass: 1.008 },
    N: { name: "Nitrogen", color: 0x0000ff, group: "Nonmetal", atomicMass: 14.01 },
    S: { name: "Sulfur", color: 0xffff00, group: "Nonmetal", atomicMass: 32.06 },
    Na: { name: "Sodium", color: 0x0000ff, group: "Alkali Metal", atomicMass: 22.99 },
    Cl: { name: "Chlorine", color: 0xffcc00, group: "Halogen", atomicMass: 35.45 }
    // Add more elements as needed
};

const molecules = {
    CO2: {
        name: "Carbon Dioxide (CO₂)",
        details: "1 Carbon atom bonded to 2 Oxygen atoms.",
        atoms: [
            { size: 2, color: 0x000000, position: { x: 0, y: 0, z: 0 }, label: "C" }, // Carbon
            { size: 1.6, color: 0xff3333, position: { x: -5, y: 0, z: 0 }, label: "O" }, // Oxygen 1
            { size: 1.6, color: 0xff3333, position: { x: 5, y: 0, z: 0 }, label: "O" }  // Oxygen 2
        ],
        bonds: [
            { start: 0, end: 1, length: 5 },
            { start: 0, end: 2, length: 5 }
        ]
    },
    O2: {
        name: "Oxygen (O₂)",
        details: "2 Oxygen atoms bonded together.",
        atoms: [
            { size: 1.6, color: 0xff3333, position: { x: -2.5, y: 0, z: 0 }, label: "O" }, // Oxygen 1
            { size: 1.6, color: 0xff3333, position: { x: 2.5, y: 0, z: 0 }, label: "O" }  // Oxygen 2
        ],
        bonds: [
            { start: 0, end: 1, length: 5 }
        ]
    },
    H2O: {
        name: "Water (H₂O)",
        details: "1 Oxygen atom bonded to 2 Hydrogen atoms.",
        atoms: [
            { size: 1.6, color: 0x0000ff, position: { x: 0, y: 0, z: 0 }, label: "O" }, // Oxygen
            { size: 1, color: 0xffffff, position: { x: -2, y: 2, z: 0 }, label: "H" }, // Hydrogen 1
            { size: 1, color: 0xffffff, position: { x: 2, y: 2, z: 0 }, label: "H" }  // Hydrogen 2
        ],
        bonds: [
            { start: 0, end: 1, length: 3 },
            { start: 0, end: 2, length: 3 }
        ]
    },
    CH4: {
        name: "Methane (CH₄)",
        details: "1 Carbon atom bonded to 4 Hydrogen atoms.",
        atoms: [
            { size: 2, color: 0x000000, position: { x: 0, y: 0, z: 0 }, label: "C" }, // Carbon
            { size: 1, color: 0xffffff, position: { x: -3, y: 0, z: 0 }, label: "H" }, // Hydrogen 1
            { size: 1, color: 0xffffff, position: { x: 3, y: 0, z: 0 }, label: "H" }, // Hydrogen 2
            { size: 1, color: 0xffffff, position: { x: 0, y: 3, z: 0 }, label: "H" }, // Hydrogen 3
            { size: 1, color: 0xffffff, position: { x: 0, y: -3, z: 0 }, label: "H" }  // Hydrogen 4
        ],
        bonds: [
            { start: 0, end: 1, length: 3 },
            { start: 0, end: 2, length: 3 },
            { start: 0, end: 3, length: 3 },
            { start: 0, end: 4, length: 3 }
        ]
    },
    NH3: {
        name: "Ammonia (NH₃)",
        details: "1 Nitrogen atom bonded to 3 Hydrogen atoms.",
        atoms: [
            { size: 2, color: 0x0000ff, position: { x: 0, y: 0, z: 0 }, label: "N" }, // Nitrogen
            { size: 1, color: 0xffffff, position: { x: -2, y: 2, z: 0 }, label: "H" }, // Hydrogen 1
            { size: 1, color: 0xffffff, position: { x: 2, y: 2, z: 0 }, label: "H" }, // Hydrogen 2
            { size: 1, color: 0xffffff, position: { x: 0, y: -2, z: 0 }, label: "H" }  // Hydrogen 3
        ],
        bonds: [
            { start: 0, end: 1, length: 3 },
            { start: 0, end: 2, length: 3 },
            { start: 0, end: 3, length: 3 }
        ]
    },
    C2H6: {
        name: "Ethane (C₂H₆)",
        details: "2 Carbon atoms bonded together, each with 3 Hydrogen atoms.",
        atoms: [
            { size: 2, color: 0x000000, position: { x: -3, y: 0, z: 0 }, label: "C" }, // Carbon 1
            { size: 2, color: 0x000000, position: { x: 3, y: 0, z: 0 }, label: "C" },  // Carbon 2
            { size: 1, color: 0xffffff, position: { x: -5, y: 2, z: 0 }, label: "H" }, // Hydrogen 1
            { size: 1, color: 0xffffff, position: { x: -5, y: -2, z: 0 }, label: "H" }, // Hydrogen 2
            { size: 1, color: 0xffffff, position: { x: -1, y: 2, z: 0 }, label: "H" }, // Hydrogen 3
            { size: 1, color: 0xffffff, position: { x: 5, y: 2, z: 0 }, label: "H" },  // Hydrogen 4
            { size: 1, color: 0xffffff, position: { x: 5, y: -2, z: 0 }, label: "H" }, // Hydrogen 5
            { size: 1, color: 0xffffff, position: { x: 1, y: -2, z: 0 }, label: "H" }  // Hydrogen 6
        ],
        bonds: [
            { start: 0, end: 1, length: 6 },
            { start: 0, end: 2, length: 3 },
            { start: 0, end: 3, length: 3 },
            { start: 0, end: 4, length: 3 },
            { start: 1, end: 5, length: 3 },
            { start: 1, end: 6, length: 3 },
            { start: 1, end: 7, length: 3 }
        ]
    },
    C3H8: {
        name: "Propane (C₃H₈)",
        details: "3 Carbon atoms in a chain, each bonded to Hydrogen atoms.",
        atoms: [
            { size: 2, color: 0x000000, position: { x: -6, y: 0, z: 0 }, label: "C" }, // Carbon 1
            { size: 2, color: 0x000000, position: { x: 0, y: 0, z: 0 }, label: "C" },  // Carbon 2
            { size: 2, color: 0x000000, position: { x: 6, y: 0, z: 0 }, label: "C" },  // Carbon 3
            { size: 1, color: 0xffffff, position: { x: -8, y: 2, z: 0 }, label: "H" }, // Hydrogen 1
            { size: 1, color: 0xffffff, position: { x: -8, y: -2, z: 0 }, label: "H" }, // Hydrogen 2
            { size: 1, color: 0xffffff, position: { x: -4, y: 2, z: 0 }, label: "H" }, // Hydrogen 3
            { size: 1, color: 0xffffff, position: { x: 2, y: 2, z: 0 }, label: "H" },  // Hydrogen 4
            { size: 1, color: 0xffffff, position: { x: 2, y: -2, z: 0 }, label: "H" }, // Hydrogen 5
            { size: 1, color: 0xffffff, position: { x: 8, y: 2, z: 0 }, label: "H" },  // Hydrogen 6
            { size: 1, color: 0xffffff, position: { x: 8, y: -2, z: 0 }, label: "H" }  // Hydrogen 7
        ],
        bonds: [
            { start: 0, end: 1, length: 6 },
            { start: 1, end: 2, length: 6 },
            { start: 0, end: 3, length: 3 },
            { start: 0, end: 4, length: 3 },
            { start: 0, end: 5, length: 3 },
            { start: 1, end: 6, length: 3 },
            { start: 1, end: 7, length: 3 },
            { start: 2, end: 8, length: 3 },
            { start: 2, end: 9, length: 3 }
        ]
    },
    C4H10: {
        name: "Butane (C₄H₁₀)",
        details: "4 Carbon atoms in a chain, each bonded to Hydrogen atoms.",
        atoms: [
            { size: 2, color: 0x000000, position: { x: -9, y: 0, z: 0 }, label: "C" }, // Carbon 1
            { size: 2, color: 0x000000, position: { x: -3, y: 0, z: 0 }, label: "C" }, // Carbon 2
            { size: 2, color: 0x000000, position: { x: 3, y: 0, z: 0 }, label: "C" },  // Carbon 3
            { size: 2, color: 0x000000, position: { x: 9, y: 0, z: 0 }, label: "C" },  // Carbon 4
            { size: 1, color: 0xffffff, position: { x: -11, y: 2, z: 0 }, label: "H" }, // Hydrogen 1
            { size: 1, color: 0xffffff, position: { x: -11, y: -2, z: 0 }, label: "H" }, // Hydrogen 2
            { size: 1, color: 0xffffff, position: { x: -7, y: 2, z: 0 }, label: "H" }, // Hydrogen 3
            { size: 1, color: 0xffffff, position: { x: -1, y: 2, z: 0 }, label: "H" },  // Hydrogen 4
            { size: 1, color: 0xffffff, position: { x: -1, y: -2, z: 0 }, label: "H" }, // Hydrogen 5
            { size: 1, color: 0xffffff, position: { x: 5, y: 2, z: 0 }, label: "H" },  // Hydrogen 6
            { size: 1, color: 0xffffff, position: { x: 5, y: -2, z: 0 }, label: "H" }, // Hydrogen 7
            { size: 1, color: 0xffffff, position: { x: 11, y: 2, z: 0 }, label: "H" }, // Hydrogen 8
            { size: 1, color: 0xffffff, position: { x: 11, y: -2, z: 0 }, label: "H" }  // Hydrogen 9
        ],
        bonds: [
            { start: 0, end: 1, length: 6 },
            { start: 1, end: 2, length: 6 },
            { start: 2, end: 3, length: 6 },
            { start: 0, end: 4, length: 3 },
            { start: 0, end: 5, length: 3 },
            { start: 0, end: 6, length: 3 },
            { start: 1, end: 7, length: 3 },
            { start: 1, end: 8, length: 3 },
            { start: 2, end: 9, length: 3 },
            { start: 2, end: 10, length: 3 },
            { start: 3, end: 11, length: 3 },
            { start: 3, end: 12, length: 3 }
        ]
    },
       C6H6: {
        name: "Benzene (C₆H₆)",
        details: "A ring of 6 Carbon atoms, each bonded to a Hydrogen atom.",
        atoms: [
            { size: 2, color: 0x000000, position: { x: 0, y: 6, z: 0 }, label: "C" },  // Carbon 1
            { size: 2, color: 0x000000, position: { x: 5.2, y: 3, z: 0 }, label: "C" }, // Carbon 2
            { size: 2, color: 0x000000, position: { x: 5.2, y: -3, z: 0 }, label: "C" }, // Carbon 3
            { size: 2, color: 0x000000, position: { x: 0, y: -6, z: 0 }, label: "C" },  // Carbon 4
            { size: 2, color: 0x000000, position: { x: -5.2, y: -3, z: 0 }, label: "C" }, // Carbon 5
            { size: 2, color: 0x000000, position: { x: -5.2, y: 3, z: 0 }, label: "C" },  // Carbon 6
            { size: 1, color: 0xffffff, position: { x: 0, y: 9, z: 0 }, label: "H" },    // Hydrogen 1
            { size: 1, color: 0xffffff, position: { x: 7.8, y: 4.5, z: 0 }, label: "H" }, // Hydrogen 2
            { size: 1, color: 0xffffff, position: { x: 7.8, y: -4.5, z: 0 }, label: "H" }, // Hydrogen 3
            { size: 1, color: 0xffffff, position: { x: 0, y: -9, z: 0 }, label: "H" },   // Hydrogen 4
            { size: 1, color: 0xffffff, position: { x: -7.8, y: -4.5, z: 0 }, label: "H" }, // Hydrogen 5
            { size: 1, color: 0xffffff, position: { x: -7.8, y: 4.5, z: 0 }, label: "H" }  // Hydrogen 6
        ],
        bonds: [
            { start: 0, end: 1, length: 5.2 },
            { start: 1, end: 2, length: 5.2 },
            { start: 2, end: 3, length: 5.2 },
            { start: 3, end: 4, length: 5.2 },
            { start: 4, end: 5, length: 5.2 },
            { start: 5, end: 0, length: 5.2 },
            { start: 0, end: 6, length: 3 },
            { start: 1, end: 7, length: 3 },
            { start: 2, end: 8, length: 3 },
            { start: 3, end: 9, length: 3 },
            { start: 4, end: 10, length: 3 },
            { start: 5, end: 11, length: 3 }
        ]
    },

    C2H4: {
        name: "Ethene (C₂H₄)",
        details: "2 Carbon atoms double-bonded, each bonded to 2 Hydrogen atoms.",
        atoms: [
            { size: 2, color: 0x000000, position: { x: -3, y: 0, z: 0 }, label: "C" }, // Carbon 1
            { size: 2, color: 0x000000, position: { x: 3, y: 0, z: 0 }, label: "C" },  // Carbon 2
            { size: 1, color: 0xffffff, position: { x: -5, y: 2, z: 0 }, label: "H" }, // Hydrogen 1
            { size: 1, color: 0xffffff, position: { x: -5, y: -2, z: 0 }, label: "H" }, // Hydrogen 2
            { size: 1, color: 0xffffff, position: { x: 5, y: 2, z: 0 }, label: "H" },  // Hydrogen 3
            { size: 1, color: 0xffffff, position: { x: 5, y: -2, z: 0 }, label: "H" }  // Hydrogen 4
        ],
        bonds: [
            { start: 0, end: 1, length: 6 }, // Double bond
            { start: 0, end: 2, length: 3 },
            { start: 0, end: 3, length: 3 },
            { start: 1, end: 4, length: 3 },
            { start: 1, end: 5, length: 3 }
        ]
    },
    
    C6H12O6: {
        name: "Glucose (C₆H₁₂O₆)",
        details: "A complex sugar molecule with 6 Carbon, 12 Hydrogen, and 6 Oxygen atoms.",
        atoms: [
            { size: 2, color: 0x000000, position: { x: 0, y: 0, z: 0 }, label: "C" },   // Carbon 1
            { size: 2, color: 0x000000, position: { x: 4, y: 0, z: 0 }, label: "C" },   // Carbon 2
            { size: 2, color: 0x000000, position: { x: 8, y: 0, z: 0 }, label: "C" },   // Carbon 3
            { size: 2, color: 0x000000, position: { x: 12, y: 0, z: 0 }, label: "C" },  // Carbon 4
            { size: 2, color: 0x000000, position: { x: 16, y: 0, z: 0 }, label: "C" },  // Carbon 5
            { size: 2, color: 0x000000, position: { x: 20, y: 0, z: 0 }, label: "C" },  // Carbon 6
            { size: 1.6, color: 0xff3333, position: { x: 2, y: 2, z: 0 }, label: "O" }, // Oxygen 1
            { size: 1.6, color: 0xff3333, position: { x: 6, y: 2, z: 0 }, label: "O" }, // Oxygen 2
            { size: 1.6, color: 0xff3333, position: { x: 10, y: 2, z: 0 }, label: "O" }, // Oxygen 3
            { size: 1.6, color: 0xff3333, position: { x: 14, y: 2, z: 0 }, label: "O" }, // Oxygen 4
            { size: 1.6, color: 0xff3333, position: { x: 18, y: 2, z: 0 }, label: "O" }, // Oxygen 5
            { size: 1.6, color: 0xff3333, position: { x: 22, y: 2, z: 0 }, label: "O" }, // Oxygen 6
            { size: 1, color: 0xffffff, position: { x: 0, y: -2, z: 0 }, label: "H" },  // Hydrogen 1
            { size: 1, color: 0xffffff, position: { x: 4, y: -2, z: 0 }, label: "H" },  // Hydrogen 2
            { size: 1, color: 0xffffff, position: { x: 8, y: -2, z: 0 }, label: "H" },  // Hydrogen 3
            { size: 1, color: 0xffffff, position: { x: 12, y: -2, z: 0 }, label: "H" }, // Hydrogen 4
            { size: 1, color: 0xffffff, position: { x: 16, y: -2, z: 0 }, label: "H" }, // Hydrogen 5
            { size: 1, color: 0xffffff, position: { x: 20, y: -2, z: 0 }, label: "H" }  // Hydrogen 6
        ],
        bonds: [
            { start: 0, end: 1, length: 4 },
            { start: 1, end: 2, length: 4 },
            { start: 2, end: 3, length: 4 },
            { start: 3, end: 4, length: 4 },
            { start: 4, end: 5, length: 4 },
            { start: 0, end: 6, length: 3 },
            { start: 1, end: 7, length: 3 },
            { start: 2, end: 8, length: 3 },
            { start: 3, end: 9, length: 3 },
            { start: 4, end: 10, length: 3 },
            { start: 5, end: 11, length: 3 },
            { start: 0, end: 12, length: 3 },
            { start: 1, end: 13, length: 3 },
            { start: 2, end: 14, length: 3 },
            { start: 3, end: 15, length: 3 },
            { start: 4, end: 16, length: 3 },
            { start: 5, end: 17, length: 3 }
        ]
    },

        C2H2: {
        name: "Ethyne (C₂H₂)",
        details: "2 Carbon atoms triple-bonded, each bonded to 1 Hydrogen atom.",
        atoms: [
            { size: 2, color: 0x000000, position: { x: -2, y: 0, z: 0 }, label: "C" }, // Carbon 1
            { size: 2, color: 0x000000, position: { x: 2, y: 0, z: 0 }, label: "C" },  // Carbon 2
            { size: 1, color: 0xffffff, position: { x: -4, y: 0, z: 0 }, label: "H" }, // Hydrogen 1
            { size: 1, color: 0xffffff, position: { x: 4, y: 0, z: 0 }, label: "H" }   // Hydrogen 2
        ],
        bonds: [
            { start: 0, end: 1, length: 4 }, // Triple bond
            { start: 0, end: 2, length: 3 },
            { start: 1, end: 3, length: 3 }
        ]
    },
    
    H2SO4: {
        name: "Sulfuric Acid (H₂SO₄)",
        details: "1 Sulfur atom bonded to 4 Oxygen atoms, with 2 Hydrogen atoms attached.",
        atoms: [
            { size: 2, color: 0xffff00, position: { x: 0, y: 0, z: 0 }, label: "S" },   // Sulfur
            { size: 1.6, color: 0xff3333, position: { x: -3, y: 3, z: 0 }, label: "O" }, // Oxygen 1
            { size: 1.6, color: 0xff3333, position: { x: 3, y: 3, z: 0 }, label: "O" },  // Oxygen 2
            { size: 1.6, color: 0xff3333, position: { x: -3, y: -3, z: 0 }, label: "O" }, // Oxygen 3
            { size: 1.6, color: 0xff3333, position: { x: 3, y: -3, z: 0 }, label: "O" },  // Oxygen 4
            { size: 1, color: 0xffffff, position: { x: -5, y: 3, z: 0 }, label: "H" },   // Hydrogen 1
            { size: 1, color: 0xffffff, position: { x: 5, y: -3, z: 0 }, label: "H" }    // Hydrogen 2
        ],
        bonds: [
            { start: 0, end: 1, length: 3 },
            { start: 0, end: 2, length: 3 },
            { start: 0, end: 3, length: 3 },
            { start: 0, end: 4, length: 3 },
            { start: 1, end: 5, length: 3 },
            { start: 4, end: 6, length: 3 }
        ]
    },
    
    C2H5OH: {
        name: "Ethanol (C₂H₅OH)",
        details: "2 Carbon atoms, 1 bonded to an OH group and 5 Hydrogen atoms.",
        atoms: [
            { size: 2, color: 0x000000, position: { x: -3, y: 0, z: 0 }, label: "C" }, // Carbon 1
            { size: 2, color: 0x000000, position: { x: 3, y: 0, z: 0 }, label: "C" },  // Carbon 2
            { size: 1, color: 0xffffff, position: { x: -5, y: 2, z: 0 }, label: "H" }, // Hydrogen 1
            { size: 1, color: 0xffffff, position: { x: -5, y: -2, z: 0 }, label: "H" }, // Hydrogen 2
            { size: 1, color: 0xffffff, position: { x: -1, y: 2, z: 0 }, label: "H" }, // Hydrogen 3
            { size: 1, color: 0xffffff, position: { x: 5, y: 2, z: 0 }, label: "H" },  // Hydrogen 4
            { size: 1, color: 0xffffff, position: { x: 5, y: -2, z: 0 }, label: "H" }, // Hydrogen 5
            { size: 1.6, color: 0xff3333, position: { x: 7, y: 0, z: 0 }, label: "O" }, // Oxygen
            { size: 1, color: 0xffffff, position: { x: 9, y: 0, z: 0 }, label: "H" }   // Hydrogen (OH group)
        ],
        bonds: [
            { start: 0, end: 1, length: 6 },
            { start: 0, end: 2, length: 3 },
            { start: 0, end: 3, length: 3 },
            { start: 0, end: 4, length: 3 },
            { start: 1, end: 5, length: 3 },
            { start: 1, end: 6, length: 3 },
            { start: 1, end: 7, length: 3 },
            { start: 7, end: 8, length: 3 }
        ]
    },
    
    H2: {
        name: "Hydrogen Gas (H₂)",
        details: "2 Hydrogen atoms bonded together.",
        atoms: [
            { size: 1, color: 0xffffff, position: { x: -1.5, y: 0, z: 0 }, label: "H" }, // Hydrogen 1
            { size: 1, color: 0xffffff, position: { x: 1.5, y: 0, z: 0 }, label: "H" }   // Hydrogen 2
        ],
        bonds: [
            { start: 0, end: 1, length: 3 }
        ]
    },
    
    NaCl: {
        name: "Sodium Chloride (NaCl)",
        details: "1 Sodium atom bonded to 1 Chlorine atom.",
        atoms: [
            { size: 2, color: 0x0000ff, position: { x: -2, y: 0, z: 0 }, label: "Na" }, // Sodium
            { size: 2, color: 0xffcc00, position: { x: 2, y: 0, z: 0 }, label: "Cl" }  // Chlorine
        ],
        bonds: [
            { start: 0, end: 1, length: 4 }
        ]
    },
    
    NH4Cl: {
        name: "Ammonium Chloride (NH₄Cl)",
        details: "1 Ammonium ion bonded to 1 Chlorine atom.",
        atoms: [
            { size: 2, color: 0x0000ff, position: { x: 0, y: 0, z: 0 }, label: "N" },   // Nitrogen
            { size: 1, color: 0xffffff, position: { x: -2, y: 2, z: 0 }, label: "H" }, // Hydrogen 1
            { size: 1, color: 0xffffff, position: { x: 2, y: 2, z: 0 }, label: "H" },  // Hydrogen 2
            { size: 1, color: 0xffffff, position: { x: -2, y: -2, z: 0 }, label: "H" }, // Hydrogen 3
            { size: 1, color: 0xffffff, position: { x: 2, y: -2, z: 0 }, label: "H" },  // Hydrogen 4
            { size: 2, color: 0xffcc00, position: { x: 5, y: 0, z: 0 }, label: "Cl" }   // Chlorine
        ],
        bonds: [
            { start: 0, end: 1, length: 3 },
            { start: 0, end: 2, length: 3 },
            { start: 0, end: 3, length: 3 },
            { start: 0, end: 4, length: 3 },
            { start: 0, end: 5, length: 5 }
        ]
    },
    
    CO: {
        name: "Carbon Monoxide (CO)",
        details: "1 Carbon atom triple-bonded to 1 Oxygen atom.",
        atoms: [
            { size: 2, color: 0x000000, position: { x: -2, y: 0, z: 0 }, label: "C" }, // Carbon
            { size: 1.6, color: 0xff3333, position: { x: 2, y: 0, z: 0 }, label: "O" }  // Oxygen
        ],
        bonds: [
            { start: 0, end: 1, length: 4 } // Triple bond
        ]
    },
    
    H2CO3: {
        name: "Carbonic Acid (H₂CO₃)",
        details: "1 Carbon atom bonded to 3 Oxygen atoms and 2 Hydrogen atoms.",
        atoms: [
            { size: 2, color: 0x000000, position: { x: 0, y: 0, z: 0 }, label: "C" },   // Carbon
            { size: 1.6, color: 0xff3333, position: { x: -3, y: 3, z: 0 }, label: "O" }, // Oxygen 1
            { size: 1.6, color: 0xff3333, position: { x: 3, y: 3, z: 0 }, label: "O" },  // Oxygen 2
            { size: 1.6, color: 0xff3333, position: { x: 0, y: -3, z: 0 }, label: "O" }, // Oxygen 3
            { size: 1, color: 0xffffff, position: { x: -5, y: 3, z: 0 }, label: "H" },   // Hydrogen 1
            { size: 1, color: 0xffffff, position: { x: 5, y: 3, z: 0 }, label: "H" }     // Hydrogen 2
        ],
        bonds: [
            { start: 0, end: 1, length: 3 },
            { start: 0, end: 2, length: 3 },
            { start: 0, end: 3, length: 3 },
            { start: 1, end: 4, length: 3 },
            { start: 2, end: 5, length: 3 }
        ]
    },
    
    O3: {
        name: "Ozone (O₃)",
        details: "3 Oxygen atoms bonded in a bent structure.",
        atoms: [
            { size: 1.6, color: 0xff3333, position: { x: -2, y: 0, z: 0 }, label: "O" }, // Oxygen 1
            { size: 1.6, color: 0xff3333, position: { x: 0, y: 2, z: 0 }, label: "O" },  // Oxygen 2
            { size: 1.6, color: 0xff3333, position: { x: 2, y: 0, z: 0 }, label: "O" }   // Oxygen 3
        ],
        bonds: [
            { start: 0, end: 1, length: 3 },
            { start: 1, end: 2, length: 3 }
        ]
    }
};