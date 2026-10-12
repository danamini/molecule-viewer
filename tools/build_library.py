#!/usr/bin/env python3
"""Build molecules.js: the curated library with real 3D coordinates.

Each molecule's atoms, bonds and bond orders come from PubChem's computed 3D
conformer (PUG REST, record_type=3d); its formula, weight and IUPAC name from
PubChem's properties. Buckminsterfullerene has no PubChem conformer, so its
truncated icosahedron is computed here (C-C 1.40 A in hexagon-hexagon bonds,
1.45 A in pentagons).

Run:  python3 tools/build_library.py   (writes molecules.js at the repo root)
"""
import itertools
import json
import math
import pathlib
import time
import urllib.parse
import urllib.request

PUG = "https://pubchem.ncbi.nlm.nih.gov/rest/pug"
OUT = pathlib.Path(__file__).resolve().parent.parent / "molecules.js"

# key, group, PubChem name (or None for computed), display name, Wikipedia title, one line on why it matters
LIBRARY = [
    ("water", "Essentials", "water", "Water", "Water",
     "Two hydrogens bent at about 104.5° around an oxygen. That bend makes water polar, and polarity makes it the solvent of life."),
    ("carbon-dioxide", "Essentials", "carbon dioxide", "Carbon dioxide", "Carbon_dioxide",
     "A straight line with a double bond on each side. Plants pull it from the air; every breath you exhale carries it out."),
    ("oxygen", "Essentials", "oxygen", "Oxygen", "Oxygen",
     "Two atoms joined by a double bond. About 21% of the air you are breathing."),
    ("ozone", "Essentials", "ozone", "Ozone", "Ozone",
     "Three oxygens in a bent chain. High in the stratosphere it absorbs much of the Sun's harmful ultraviolet light."),
    ("ammonia", "Essentials", "ammonia", "Ammonia", "Ammonia",
     "A nitrogen atop three hydrogens, shaped like a squat pyramid. Made industrially, it fertilises much of the world's food."),
    ("methane", "Essentials", "methane", "Methane", "Methane",
     "The simplest tetrahedron in chemistry: four hydrogens 109.5° apart. The main ingredient of natural gas."),
    ("hydrogen-peroxide", "Essentials", "hydrogen peroxide", "Hydrogen peroxide", "Hydrogen_peroxide",
     "Water with one oxygen too many, twisted like an open book. A bleach, an antiseptic and a rocket propellant."),
    ("nitrous-oxide", "Essentials", "nitrous oxide", "Nitrous oxide", "Nitrous_oxide",
     "Laughing gas: a straight N–N–O line, used as an anaesthetic since the 1840s."),
    ("acetylene", "Essentials", "acetylene", "Acetylene", "Acetylene",
     "Two carbons held by a triple bond, the strongest kind. It burns hot enough to cut steel."),
    ("ethanol", "Essentials", "ethanol", "Ethanol", "Ethanol",
     "Two carbons and a hydroxyl group. Yeast has been making it for us for at least nine thousand years."),

    ("caffeine", "Everyday", "caffeine", "Caffeine", "Caffeine",
     "Fits the brain's adenosine receptors without switching them on, so the signal for drowsiness never arrives."),
    ("aspirin", "Everyday", "aspirin", "Aspirin", "Aspirin",
     "Acetylsalicylic acid, a refined cousin of the salicylates in willow bark. Sold by Bayer since 1899."),
    ("paracetamol", "Everyday", "acetaminophen", "Paracetamol", "Paracetamol",
     "One of the world's most used medicines for pain and fever, and still not fully understood."),
    ("ibuprofen", "Everyday", "ibuprofen", "Ibuprofen", "Ibuprofen",
     "Blocks the enzymes that make inflammatory prostaglandins. Developed at Boots in the 1960s."),
    ("glucose", "Everyday", "glucose", "Glucose", "Glucose",
     "A six-carbon sugar that folds into a ring. The fuel your brain burns almost exclusively."),
    ("sucrose", "Everyday", "sucrose", "Sucrose", "Sucrose",
     "Table sugar: a glucose and a fructose ring joined by a single oxygen bridge."),
    ("vanillin", "Everyday", "vanillin", "Vanillin", "Vanillin",
     "The main flavour of vanilla. Most of the world's supply is made, not grown."),
    ("capsaicin", "Everyday", "capsaicin", "Capsaicin", "Capsaicin",
     "The heat of chilli. It triggers TRPV1, the same nerve receptor that reports real burns."),
    ("menthol", "Everyday", "menthol", "Menthol", "Menthol",
     "Switches on TRPM8, the nerve's cold sensor, which is why mint feels cool without being cold."),
    ("citric-acid", "Everyday", "citric acid", "Citric acid", "Citric_acid",
     "The sour of lemons, and a step in the cycle every cell uses to release energy."),
    ("vitamin-c", "Everyday", "ascorbic acid", "Vitamin C", "Vitamin_C",
     "Ascorbic acid. Humans lost the ability to make it, so a diet without it ends in scurvy."),
    ("nicotine", "Everyday", "nicotine", "Nicotine", "Nicotine",
     "Mimics acetylcholine at nerve receptors. The tobacco plant makes it as an insecticide."),
    ("limonene", "Everyday", "limonene", "Limonene", "Limonene",
     "The scent of citrus peel. Its two mirror-image forms smell slightly different."),
    ("cinnamaldehyde", "Everyday", "cinnamaldehyde", "Cinnamaldehyde", "Cinnamaldehyde",
     "Gives cinnamon its flavour and smell."),
    ("acetone", "Everyday", "acetone", "Acetone", "Acetone",
     "The simplest ketone. Nail-polish remover, and something your own body makes when it burns fat."),

    ("dopamine", "Body and brain", "dopamine", "Dopamine", "Dopamine",
     "A messenger for movement, motivation and reward. Its loss in one brain region causes Parkinson's disease."),
    ("serotonin", "Body and brain", "serotonin", "Serotonin", "Serotonin",
     "Linked to mood, but most of the body's serotonin is made in the gut."),
    ("adrenaline", "Body and brain", "epinephrine", "Adrenaline", "Adrenaline",
     "The fight-or-flight hormone: faster heart, wider airways, sugar released into the blood."),
    ("melatonin", "Body and brain", "melatonin", "Melatonin", "Melatonin",
     "Released by the pineal gland as darkness falls, setting the body's clock for sleep."),
    ("testosterone", "Body and brain", "testosterone", "Testosterone", "Testosterone",
     "A steroid hormone: four fused carbon rings, like all steroids, with small changes that mean everything."),
    ("estradiol", "Body and brain", "estradiol", "Oestradiol", "Estradiol",
     "The main oestrogen. Compare it with testosterone: the rings are the same, the details are not."),
    ("cholesterol", "Body and brain", "cholesterol", "Cholesterol", "Cholesterol",
     "Stiffens every animal cell membrane and is the starting material for steroid hormones."),
    ("retinal", "Body and brain", "retinal", "Retinal", "Retinal",
     "The molecule that lets you see. A photon flips its chain from bent to straight, and a nerve fires."),
    ("glycine", "Body and brain", "glycine", "Glycine", "Glycine",
     "The smallest amino acid: its side chain is a single hydrogen."),
    ("tryptophan", "Body and brain", "tryptophan", "Tryptophan", "Tryptophan",
     "An essential amino acid, and the raw material for serotonin and melatonin."),
    ("atp", "Body and brain", "adenosine triphosphate", "ATP", "Adenosine_triphosphate",
     "The cell's energy currency. Snapping off the last phosphate pays for nearly everything a cell does."),

    ("adenine", "DNA", "adenine", "Adenine", "Adenine",
     "One of DNA's four letters. Pairs with thymine through two hydrogen bonds."),
    ("thymine", "DNA", "thymine", "Thymine", "Thymine",
     "DNA's T. In RNA it is replaced by uracil, which lacks one methyl group."),
    ("guanine", "DNA", "guanine", "Guanine", "Guanine",
     "DNA's G. Pairs with cytosine through three hydrogen bonds, a slightly stronger pair."),
    ("cytosine", "DNA", "cytosine", "Cytosine", "Cytosine",
     "DNA's C. Adding a methyl group to it is one way cells switch genes off."),

    ("penicillin", "Medicine", "penicillin G", "Penicillin G", "Benzylpenicillin",
     "Noticed by Alexander Fleming in 1928. Its strained four-membered ring breaks open inside bacterial cell walls."),
    ("morphine", "Medicine", "morphine", "Morphine", "Morphine",
     "Isolated from the opium poppy in the early 1800s; still a standard against severe pain."),
    ("quinine", "Medicine", "quinine", "Quinine", "Quinine",
     "From cinchona bark, the first effective malaria treatment, and the bitterness in tonic water."),
    ("artemisinin", "Medicine", "artemisinin", "Artemisinin", "Artemisinin",
     "From sweet wormwood. Its oxygen–oxygen bridge kills malaria parasites; Tu Youyou won the 2015 Nobel Prize for it."),
    ("metformin", "Medicine", "metformin", "Metformin", "Metformin",
     "The first-line drug for type 2 diabetes, descended from a compound in French lilac."),

    ("benzene", "Shapes and materials", "benzene", "Benzene", "Benzene",
     "A flat hexagon of carbon with its electrons shared all the way round. Kekulé proposed the ring in 1865."),
    ("naphthalene", "Shapes and materials", "naphthalene", "Naphthalene", "Naphthalene",
     "Two benzene rings sharing an edge. The smell of old mothballs."),
    ("cubane", "Shapes and materials", "cubane", "Cubane", "Cubane",
     "Eight carbons at the corners of a cube, bonds forced to 90°. First made in 1964, against expectations."),
    ("adamantane", "Shapes and materials", "adamantane", "Adamantane", "Adamantane",
     "The smallest piece of a diamond's lattice, cut out and capped with hydrogens."),
    ("buckminsterfullerene", "Shapes and materials", None, "Buckminsterfullerene", "Buckminsterfullerene",
     "Sixty carbons in the pattern of a football: 12 pentagons, 20 hexagons. Found in 1985; Nobel Prize 1996."),
    ("epoxy", "Shapes and materials", "bisphenol A diglycidyl ether", "Epoxy resin", "Bisphenol_A_diglycidyl_ether",
     "The building block of epoxy: the hard black plastic around chips. Mixed with a hardener, millions of these link into one solid web."),
    ("isoprene", "Shapes and materials", "isoprene", "Isoprene", "Isoprene",
     "The unit of natural rubber. Rubber trees chain thousands of them into long, tangled, springy molecules."),
    ("beta-carotene", "Shapes and materials", "beta-carotene", "Beta-carotene", "Beta-Carotene",
     "A long chain of alternating single and double bonds that absorbs blue light, so carrots look orange."),
]


def get(url, tries=4):
    for i in range(tries):
        try:
            with urllib.request.urlopen(url, timeout=30) as r:
                return r.read().decode()
        except Exception:
            if i == tries - 1:
                raise
            time.sleep(1.5 * (i + 1))


def parse_sdf(text):
    lines = text.splitlines()
    counts = lines[3]
    na, nb = int(counts[0:3]), int(counts[3:6])
    atoms = []
    for line in lines[4:4 + na]:
        x, y, z = float(line[0:10]), float(line[10:20]), float(line[20:30])
        atoms.append([line[31:34].strip(), round(x, 3), round(y, 3), round(z, 3)])
    bonds = []
    for line in lines[4 + na:4 + na + nb]:
        a, b, order = int(line[0:3]) - 1, int(line[3:6]) - 1, int(line[6:9])
        bonds.append([a, b, order])
    cid = int(lines[0].strip()) if lines[0].strip().isdigit() else None
    return cid, atoms, bonds


def fullerene():
    phi = (1 + 5 ** 0.5) / 2
    base = [(0, 1, 3 * phi), (1, 2 + phi, 2 * phi), (phi, 2, phi ** 3)]
    even = [(0, 1, 2), (1, 2, 0), (2, 0, 1)]
    pts = set()
    for v in base:
        for p in even:
            w = [v[p[0]], v[p[1]], v[p[2]]]
            for signs in itertools.product((1, -1), repeat=3):
                pts.add(tuple(round(s * c, 6) for s, c in zip(signs, w)))
    pts = sorted(pts)
    assert len(pts) == 60
    scale = 1.42 / 2  # edge length 2 in these coordinates
    atoms = [["C", round(x * scale, 3), round(y * scale, 3), round(z * scale, 3)] for x, y, z in pts]
    bonds = []
    for i, j in itertools.combinations(range(60), 2):
        if abs(math.dist(pts[i], pts[j]) - 2) < 1e-3:
            bonds.append([i, j, 1])
    # A bond is hexagon-hexagon (double) when neither end's other bonds close a pentagon with it:
    # mark doubles as a perfect matching that avoids pentagon edges (the 30 edges shared by two hexagons).
    nbr = {i: set() for i in range(60)}
    for a, b, _ in bonds:
        nbr[a].add(b)
        nbr[b].add(a)

    def in_pentagon(a, b):
        # a five-cycle through edge a-b: a-b-c-d-e-a
        for c in nbr[b] - {a}:
            for d in nbr[c] - {a, b}:
                for e in nbr[d] - {a, b, c}:
                    if a in nbr[e]:
                        return True
        return False

    for bond in bonds:
        if not in_pentagon(bond[0], bond[1]):
            bond[2] = 2
    assert sum(1 for b in bonds if b[2] == 2) == 30
    return atoms, bonds


def lattice_bonds(atoms, rules):
    """Bonds between atoms closer than the cutoff for their element pair; order 0 marks an ionic contact."""
    bonds = []
    for i, j in itertools.combinations(range(len(atoms)), 2):
        pair = "".join(sorted((atoms[i][0], atoms[j][0])))
        if pair in rules:
            cutoff, order = rules[pair]
            if math.dist(atoms[i][1:], atoms[j][1:]) < cutoff:
                bonds.append([i, j, order])
    return bonds


def prune(atoms, bonds, min_bonds):
    """Drop atoms left with fewer than min_bonds bonds at the fragment's edge (dangling ends)."""
    keep = [i for i in range(len(atoms)) if sum(1 for b in bonds if i in b[:2]) >= min_bonds]
    index = {old: new for new, old in enumerate(keep)}
    atoms = centre([atoms[i] for i in keep])
    return atoms, [[index[a], index[b], o] for a, b, o in bonds if a in index and b in index]


def centre(atoms):
    n = len(atoms)
    mx, my, mz = (sum(a[k] for a in atoms) / n for k in (1, 2, 3))
    return [[a[0], round(a[1] - mx, 3), round(a[2] - my, 3), round(a[3] - mz, 3)] for a in atoms]


def quartz():
    # alpha-quartz, P3(2)21, a = 4.913 A, c = 5.405 A (Levien, Prewitt and Weidner 1980); the unit cell's
    # 3 Si and 6 O generated from Si x = 0.4697 and O (0.4135, 0.2669, 0.1191)
    a, c = 4.913, 5.405
    si = [(0, 0.4697, 2 / 3), (0.4697, 0, 0), (0.5303, 0.5303, 1 / 3)]
    o = [(0.1466, 0.7331, 0.8809), (0.2669, 0.4135, 0.54757), (0.4135, 0.2669, 0.1191),
         (0.5865, 0.8534, 0.21423), (0.7331, 0.1466, 0.78577), (0.8534, 0.5865, 0.45243)]
    atoms = []
    for i, j, k in itertools.product(range(3), range(3), range(2)):
        for el, sites in (("Si", si), ("O", o)):
            for x, y, z in sites:
                x, y, z = x + i, y + j, z + k
                atoms.append([el, a * (x - 0.5 * y), a * (math.sqrt(3) / 2 * y), c * z])
    atoms = centre(atoms)
    bonds = lattice_bonds(atoms, {"OSi": (1.7, 1)})
    return prune(atoms, bonds, 1)


def diamond():
    a = 3.567
    basis = [(0, 0, 0), (0, .5, .5), (.5, 0, .5), (.5, .5, 0), (.25, .25, .25), (.25, .75, .75), (.75, .25, .75), (.75, .75, .25)]
    pts = {}
    for i, j, k in itertools.product(range(-2, 2), repeat=3):
        for x, y, z in basis:
            p = (round(a * (x + i), 3), round(a * (y + j), 3), round(a * (z + k), 3))
            pts[p] = 1
    atoms = [["C", *p] for p in pts]
    atoms = centre(atoms)
    atoms = [at for at in atoms if math.dist(at[1:], (0, 0, 0)) < 5.6]
    return atoms, lattice_bonds(atoms, {"CC": (1.6, 1)})


def salt():
    d = 2.82  # Na-Cl distance, half the 5.64 A cubic cell
    atoms = []
    for i, j, k in itertools.product(range(4), repeat=3):
        atoms.append(["Na" if (i + j + k) % 2 == 0 else "Cl", i * d, j * d, k * d])
    atoms = centre(atoms)
    return atoms, lattice_bonds(atoms, {"ClNa": (2.9, 0)})


def graphene():
    cc = 1.42
    a1, a2 = (cc * math.sqrt(3), 0.0), (cc * math.sqrt(3) / 2, cc * 1.5)
    atoms = []
    for i, j in itertools.product(range(-6, 7), repeat=2):
        ox, oy = i * a1[0] + j * a2[0], i * a1[1] + j * a2[1]
        for bx, by in ((0, 0), (0, cc)):
            atoms.append(["C", ox + bx, oy + by, 0.0])
    atoms = centre(atoms)
    atoms = [at for at in atoms if math.hypot(at[1], at[2]) < 8.2]
    atoms = centre(atoms)
    return prune(atoms, lattice_bonds(atoms, {"CC": (1.5, 1)}), 2)


def ice(seed=7):
    """Hexagonal ice (ice Ih) seen down its six-fold c axis, a slab three bilayers thick.

    Oxygens sit on a wurtzite lattice (a = 4.518 A, c = 7.356 A near -20 C; O-O = 3c/8 = 2.76 A).
    Hydrogens follow the Bernal-Fowler ice rules: two on every oxygen, one on every O-O link, chosen at
    random as in real ice. Bonds of order -1 are the hydrogen bonds H...O. Also returns the six-membered
    rings of each bilayer, the hexagons the snowflake's symmetry comes from.
    """
    import random
    rnd = random.Random(seed)
    a, c = 4.518, 7.356
    basis = [(1 / 3, 2 / 3, 0), (2 / 3, 1 / 3, 0.5), (1 / 3, 2 / 3, 3 / 8), (2 / 3, 1 / 3, 7 / 8)]
    ox = []
    for i, j, k in itertools.product(range(-5, 6), range(-5, 6), range(2)):
        for fx, fy, fz in basis:
            x, y = fx + i, fy + j
            px, py, pz = a * (x - 0.5 * y), a * (math.sqrt(3) / 2 * y), c * (fz + k)
            if math.hypot(px, py) < 11.5 and pz < 1.3 * c:
                ox.append((px, py, pz))
    # neighbours, pruning oxygens left with fewer than two links at the edge
    while True:
        nb = {i: [j for j in range(len(ox)) if j != i and math.dist(ox[i], ox[j]) < 3.0] for i in range(len(ox))}
        weak = [i for i in nb if len(nb[i]) < 2]
        if not weak:
            break
        ox = [o for k, o in enumerate(ox) if k not in weak]
    links = sorted({tuple(sorted((i, j))) for i in nb for j in nb[i]})
    # orient each link (donor -> acceptor); fix violations by random flips until the ice rules hold
    donor = {l: rnd.choice(l) for l in links}

    def out(i):
        return sum(1 for l in links if i in l and donor[l] == i)

    def cost(i):
        free = 4 - len(nb[i])  # dangling directions at the surface can hold the missing hydrogens
        o = out(i)
        return max(0, o - 2) + max(0, (2 - free) - o)

    for _ in range(200000):
        bad = [i for i in nb if cost(i)]
        if not bad:
            break
        i = rnd.choice(bad)
        mine = [l for l in links if i in l]
        l = rnd.choice(mine)
        before = cost(l[0]) + cost(l[1])
        donor[l] = l[0] if donor[l] == l[1] else l[1]
        if cost(l[0]) + cost(l[1]) > before and rnd.random() > 0.3:
            donor[l] = l[0] if donor[l] == l[1] else l[1]
    assert not any(cost(i) for i in nb), "ice rules not satisfied"

    def unit(v):
        n = math.sqrt(sum(x * x for x in v))
        return [x / n for x in v]

    atoms = [["O", *o] for o in ox]
    bonds = []
    for i in nb:
        dirs = [(unit([ox[l[1] if l[0] == i else l[0]][k] - ox[i][k] for k in range(3)]), l) for l in links if i in l]
        mine = [(d, l) for d, l in dirs if donor[l] == i]
        need = 2 - len(mine)
        hs = [d for d, _ in mine]
        if need:
            us = [d for d, _ in dirs]
            s_ = unit([-sum(u[k] for u in us) for k in range(3)])
            if len(us) == 3:
                missing = [s_]
            else:  # two links: the two missing tetrahedral directions
                n_ = unit([us[0][1] * us[1][2] - us[0][2] * us[1][1], us[0][2] * us[1][0] - us[0][0] * us[1][2],
                           us[0][0] * us[1][1] - us[0][1] * us[1][0]])
                t = math.radians(109.47 / 2)
                missing = [[s_[k] * math.cos(t) + sg * n_[k] * math.sin(t) for k in range(3)] for sg in (1, -1)]
            rnd.shuffle(missing)
            hs += missing[:need]
        for d in hs:
            h = len(atoms)
            atoms.append(["H", *[ox[i][k] + 0.96 * d[k] for k in range(3)]])
            bonds.append([i, h, 1])
            for dd, l in mine:
                if dd is d:
                    acc = l[1] if l[0] == i else l[0]
                    bonds.append([h, acc, -1])
    # six-membered rings within a bilayer (all six oxygens within 1.2 A of each other in height)
    rings = set()
    for start in nb:
        stack = [[start]]
        while stack:
            path = stack.pop()
            if len(path) == 6:
                if start in nb[path[-1]] and max(ox[k][2] for k in path) - min(ox[k][2] for k in path) < 1.2:
                    rings.add(tuple(path) if path[1] < path[-1] else (path[0], *reversed(path[1:])))
                continue
            for n in nb[path[-1]]:
                if n not in path and n > start:
                    stack.append(path + [n])
    mz = sum(o[2] for o in ox) / len(ox)
    atoms = [[el, round(x, 3), round(y, 3), round(z - mz, 3)] for el, x, y, z in atoms]
    return atoms, bonds, {"rings": sorted(rings)}


def cubic(a, basis, radius, element, cutoff, order):
    pts = {}
    for i, j, k in itertools.product(range(-3, 3), repeat=3):
        for x, y, z in basis:
            pts[(round(a * (x + i), 3), round(a * (y + j), 3), round(a * (z + k), 3))] = 1
    atoms = centre([[element, *p] for p in pts])
    atoms = [at for at in atoms if math.dist(at[1:], (0, 0, 0)) < radius]
    return prune(atoms, lattice_bonds(atoms, {element * 2: (cutoff, order)}), 2)


def gold():
    # face-centred cubic, a = 4.078 A; nearest neighbours 2.88 A, twelve each. Metallic bonding is a sea
    # of shared electrons, not pairs, so the contacts are drawn as order 0
    fcc = [(0, 0, 0), (0, .5, .5), (.5, 0, .5), (.5, .5, 0)]
    return cubic(4.078, fcc, 7.2, "Au", 3.0, 0)


def copper():
    # face-centred cubic, a = 3.615 A; nearest neighbours 2.56 A
    return cubic(3.615, [(0, 0, 0), (0, .5, .5), (.5, 0, .5), (.5, .5, 0)], 6.6, "Cu", 2.7, 0)


def aluminium():
    # face-centred cubic, a = 4.050 A; nearest neighbours 2.86 A
    return cubic(4.050, [(0, 0, 0), (0, .5, .5), (.5, 0, .5), (.5, .5, 0)], 7.0, "Al", 3.0, 0)


def iron():
    # body-centred cubic (alpha iron, the main ingredient of steel), a = 2.866 A; nearest neighbours 2.48 A
    return cubic(2.866, [(0, 0, 0), (.5, .5, .5)], 6.4, "Fe", 2.6, 0)


def silicon():
    # diamond cubic, a = 5.431 A; Si-Si 2.35 A
    basis = [(0, 0, 0), (0, .5, .5), (.5, 0, .5), (.5, .5, 0), (.25, .25, .25), (.25, .75, .75), (.75, .25, .75), (.75, .75, .25)]
    return cubic(5.431, basis, 8.2, "Si", 2.5, 1)


CRYSTALS = [
    ("quartz", quartz, "Quartz", "Quartz", "SiO2", 60.08,
     "α-quartz: every silicon sits in a tetrahedron of four oxygens, and the tetrahedra spiral up the crystal in one direction. That twist is why a squeezed quartz crystal makes a voltage, and why it keeps time in watches.",
     "α-quartz lattice, a = 4.913 Å, c = 5.405 Å (Levien, Prewitt and Weidner, 1980)"),
    ("diamond", diamond, "Diamond", "Diamond", "C", 12.011,
     "Every carbon bonded to four others in perfect tetrahedra, in all directions at once. No weak plane to slide along: the hardest natural material.",
     "Diamond cubic lattice, a = 3.567 Å"),
    ("salt", salt, "Table salt", "Sodium_chloride", "NaCl", 58.44,
     "Not molecules at all: sodium and chloride ions alternate in a cube, each held by its six neighbours' charge. The lines here show those contacts, not shared electrons.",
     "Rock-salt lattice, a = 5.64 Å"),
    ("graphene", graphene, "Graphene", "Graphene", "C", 12.011,
     "A single sheet of carbon hexagons, one atom thick. Stack millions and you have pencil graphite.",
     "Hexagonal sheet, C–C 1.42 Å"),
    ("gold", gold, "Gold", "Gold", "Au", 196.97,
     "Gold atoms stacked the densest way spheres can be, each touching twelve neighbours, all sharing a sea of loose electrons. That sea is why metals conduct and bend instead of shattering.",
     "Face-centred cubic lattice, a = 4.078 Å"),
    ("copper", copper, "Copper", "Copper", "Cu", 63.546,
     "Copper atoms in the same dense stacking as gold, sharing a sea of loose electrons that carries current so well that copper wires almost every building and circuit board.",
     "Face-centred cubic lattice, a = 3.615 Å"),
    ("aluminium", aluminium, "Aluminium", "Aluminium", "Al", 26.982,
     "Light, densely packed atoms under a skin of oxide only a few nanometres thick that stops the metal corroding.",
     "Face-centred cubic lattice, a = 4.050 Å"),
    ("iron", iron, "Iron", "Iron", "Fe", 55.845,
     "Iron at room temperature: each atom at the centre of a cube of eight others. Add a little carbon in the gaps and it becomes steel.",
     "Body-centred cubic lattice (alpha iron), a = 2.866 Å"),
    ("silicon", silicon, "Silicon", "Silicon", "Si", 28.085,
     "The crystal inside every computer chip: silicon arranged exactly like diamond, grown so pure that only about one atom in a billion is anything else.",
     "Diamond cubic lattice, a = 5.431 Å"),
    ("ice", ice, "Ice", "Ice_Ih", "H2O", 18.015,
     "Hexagonal ice. Each water molecule holds four neighbours by hydrogen bonds (dashed), and the bonds close into rings of six. Look down the crystal and the rings line up into hexagonal channels.",
     "Ice Ih lattice, a = 4.518 Å, c = 7.356 Å; hydrogens placed by the Bernal–Fowler ice rules"),
]


def main():
    crystals = []
    for key, build, name, wiki, formula, weight, blurb, source in CRYSTALS:
        atoms, bonds, *extra = build()
        crystals.append(dict(key=key, name=name, group="Crystals", wiki=wiki, blurb=blurb, cid=None, iupac="",
                        formula=formula, weight=weight, crystal=True, source=source, atoms=atoms, bonds=bonds,
                        **(extra[0] if extra else {})))
        print(f"{key:22} {formula:12} {len(atoms):4} atoms  {len(bonds)} bonds (lattice)")
    out = []
    for key, group, query, name, wiki, blurb in LIBRARY:
        if query is None:
            atoms, bonds = fullerene()
            entry = dict(key=key, name=name, group=group, wiki=wiki, blurb=blurb, cid=123591,
                         iupac="(C60-Ih)[5,6]fullerene", formula="C60", weight=720.6,
                         source="Computed truncated icosahedron (PubChem has no 3D conformer)",
                         atoms=atoms, bonds=bonds)
        else:
            q = urllib.parse.quote(query)
            sdf = get(f"{PUG}/compound/name/{q}/SDF?record_type=3d")
            cid, atoms, bonds = parse_sdf(sdf)
            props = json.loads(get(f"{PUG}/compound/cid/{cid}/property/MolecularFormula,MolecularWeight,IUPACName/JSON"))
            p = props["PropertyTable"]["Properties"][0]
            entry = dict(key=key, name=name, group=group, wiki=wiki, blurb=blurb, cid=cid,
                         iupac=p.get("IUPACName", ""), formula=p["MolecularFormula"],
                         weight=round(float(p["MolecularWeight"]), 2),
                         source="PubChem 3D conformer", atoms=atoms, bonds=bonds)
            time.sleep(0.25)  # PubChem asks for no more than five requests a second
        print(f"{key:22} {entry['formula']:12} {len(entry['atoms']):4} atoms  CID {entry['cid']}")
        out.append(entry)
    out += crystals
    body = ",\n".join(json.dumps(e, ensure_ascii=False, separators=(",", ":")) for e in out)
    OUT.write_text(
        "// Generated by tools/build_library.py from PubChem 3D conformers (https://pubchem.ncbi.nlm.nih.gov).\n"
        "// Atoms are [element, x, y, z] in angstroms; bonds are [atomIndex, atomIndex, order]. Do not edit by hand.\n"
        f"export const LIBRARY = [\n{body}\n];\n")
    print(f"wrote {OUT} ({OUT.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
