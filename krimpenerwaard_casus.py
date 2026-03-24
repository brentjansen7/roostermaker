#!/usr/bin/env python3
# encoding: utf-8
"""
Krimpenerwaard College -- Realistische Casus
826 leerlingen, 82 docenten, 20 vakken, 35 lokalen
"""
import requests, random, sys, time
from collections import defaultdict

BASE_URL = "http://localhost:3001/api"
s = requests.Session()
random.seed(2026)

def log(msg):
    sys.stdout.buffer.write((msg + "\n").encode("utf-8", errors="replace"))
    sys.stdout.buffer.flush()

# ─── NAMEN ────────────────────────────────────────────────────────────────────

VOORNAMEN_V = [
    "Sophie","Emma","Noor","Lena","Julia","Fleur","Sara","Lisa","Roos","Iris",
    "Mila","Eva","Anna","Eline","Lotte","Sanne","Yasmine","Naomi","Fenna","Bo",
    "Demi","Pleun","Tess","Vera","Anouk","Nina","Charlotte","Hannah","Lauren","Bente",
    "Manon","Olivia","Amy","Saar","Lieke","Lynn","Kiki","Joëlle","Amber","Jolien",
    "Merel","Hailey","Zoë","Marleen","Rianne","Celeste","Femke","Ilse","Renske","Dorien",
]
VOORNAMEN_M = [
    "Daan","Luuk","Sven","Tim","Bas","Lars","Niels","Milan","Ruben","Noah",
    "Liam","Finn","Jesse","Thijs","Joris","Bram","Tom","Max","Cas","Floris",
    "Stef","Rik","Niek","Jayden","Justin","Kevin","Dylan","Robin","Pieter","Wouter",
    "Jeroen","Maarten","Thomas","Victor","David","Yorick","Quinten","Arjan","Brendan","Zander",
    "Hamid","Omar","Youssef","Mehmet","Tariq","Gianni","Lorenzo","Rafael","Ivan","Andrei",
]
ACHTERNAMEN = [
    "Bakker","de Boer","van den Berg","Brouwer","Dekker","van Dijk","Hendriks",
    "Jansen","de Jong","Kuipers","Meijer","Mulder","Peters","Smit","Vermeulen",
    "Visser","de Vries","Willems","Blom","Bos","de Graaf","van der Hoeven",
    "Hoekstra","Jacobs","Kok","Leeuw","Maas","Prins","Snel","van Dam",
    "Wolff","Pietersen","Huisman","Post","van Leeuwen","Groot","Langen",
    "Dijkstra","Vos","Smeets","van der Berg","Cornelissen","Bergman","Hartman",
    "van Vliet","Oosterhout","Ridderbos","Kooij","Verhoeven","de Wit",
    "Timmermans","Akkerman","van Rijn","Groen","Zwart","van Noort","Nijs",
    "Schippers","Bosman","Hermans","Geerts","Wouters","Claassen","Molenaar",
    "Fontijn","van der Laan","Overbeek","de Haan","Langerak","van Gils",
]
ALLE_VOORNAMEN = VOORNAMEN_V + VOORNAMEN_M

DOCENT_VOORNAMEN = [
    "Anne","Bert","Carla","Dirk","Els","Frank","Greet","Herman","Inge","Jan",
    "Karin","Leo","Miriam","Nils","Olga","Pim","Roos","Stefan","Tineke","Udo",
    "Vera","Wim","Xandra","Yvette","Zeger","Ad","Bea","Cor","Daan","Eef",
    "Gerrit","Hilde","Igor","Joke","Karel","Lies","Marjo","Noud","Petra","Rene",
]

# ─── LOGIN & SETUP ────────────────────────────────────────────────────────────

def setup():
    r = s.post(f"{BASE_URL}/setup", json={
        "schoolnaam": "Krimpenerwaard College",
        "wachtwoord": "krimpen2026"
    })
    assert r.ok, f"Setup mislukt: {r.text}"
    log("Ingelogd: Krimpenerwaard College (wachtwoord: krimpen2026)")

# ─── VAKKEN ──────────────────────────────────────────────────────────────────

VAKKEN_LIJST = [
    ("NED","Nederlands"),("ENG","Engels"),("DUI","Duits"),("FRA","Frans"),
    ("WIS","Wiskunde"),("NAT","Natuurkunde"),("SCH","Scheikunde"),("BIO","Biologie"),
    ("GES","Geschiedenis"),("AK","Aardrijkskunde"),("EC","Economie"),
    ("BSM","Bedrijfseconomie"),("KUN","Kunst & Cultuur"),("LO","Lichamelijke Opvoeding"),
    ("MEN","Maatschappijleer"),("INF","Informatica"),("ANW","Alg. Nat.wetenschappen"),
    ("FIL","Filosofie"),("LAT","Latijn"),("MU","Muziek"),
]

def maak_vakken():
    ids = {}
    for code, naam in VAKKEN_LIJST:
        r = s.post(f"{BASE_URL}/vakken", json={"code": code, "naam": naam})
        if r.ok:
            ids[code] = r.json()["id"]
    log(f"  {len(ids)} vakken aangemaakt")
    return ids

# ─── LOKALEN ─────────────────────────────────────────────────────────────────

def maak_lokalen():
    lokalen = []
    # Verdieping 0 en 1: normale lokalen
    for verd in [0, 1]:
        for num in range(1, 11):
            lokalen.append({
                "code": f"{verd}.{num:02d}",
                "naam": f"Lokaal {verd}.{num:02d}",
                "capaciteit": 30, "type": "normaal"
            })
    # Verdieping 2: bovenbouw lokalen
    for num in range(1, 6):
        lokalen.append({
            "code": f"2.{num:02d}",
            "naam": f"Lokaal 2.{num:02d}",
            "capaciteit": 28, "type": "normaal"
        })
    # Gymzalen
    for letter in ["A","B","C"]:
        lokalen.append({"code": f"GYM-{letter}", "naam": f"Gymzaal {letter}", "capaciteit": 35, "type": "gym"})
    # Labs
    for code, naam in [("LAB-N","Lab Natuurkunde"),("LAB-S","Lab Scheikunde"),("LAB-B","Lab Biologie")]:
        lokalen.append({"code": code, "naam": naam, "capaciteit": 26, "type": "lab"})
    # ICT
    lokalen.append({"code": "ICT-1", "naam": "ICT-lokaal 1", "capaciteit": 32, "type": "ict"})
    lokalen.append({"code": "ICT-2", "naam": "ICT-lokaal 2", "capaciteit": 32, "type": "ict"})
    # Aula
    lokalen.append({"code": "AULA", "naam": "Aula", "capaciteit": 300, "type": "normaal"})

    aangemaakt = 0
    for l in lokalen:
        r = s.post(f"{BASE_URL}/lokalen", json=l)
        if r.ok:
            aangemaakt += 1
    log(f"  {aangemaakt} lokalen aangemaakt")

# ─── DOCENTEN ────────────────────────────────────────────────────────────────

VAK_DOCENT_AANTALLEN = {
    "NED":5,"ENG":5,"WIS":5,"BIO":4,"NAT":4,"SCH":3,"GES":4,
    "AK":3,"EC":3,"DUI":3,"FRA":3,"LO":5,"KUN":3,"MEN":2,
    "INF":3,"LAT":2,"BSM":2,"FIL":2,"ANW":2,"MU":2,
}

def maak_docenten(vak_ids):
    docent_ids_per_vak = {}
    vnaam_idx = 0
    anaam_idx = 0
    teller = 1

    for vak_code, aantal in VAK_DOCENT_AANTALLEN.items():
        vak_id = vak_ids.get(vak_code)
        if not vak_id:
            continue
        docent_ids_per_vak[vak_code] = []

        for i in range(aantal):
            voornaam = DOCENT_VOORNAMEN[vnaam_idx % len(DOCENT_VOORNAMEN)]
            achternaam = ACHTERNAMEN[anaam_idx % len(ACHTERNAMEN)]
            vnaam_idx += 3
            anaam_idx += 7  # stride om herhaling te vermijden

            # Unieke afkorting: eerste letters van voor- en achternaam
            parts = achternaam.replace("van den ","V").replace("van der ","V").replace("van ","V").replace("de ","D").replace("den ","D").split()
            if len(parts) >= 2:
                afk = (voornaam[0] + parts[0][0] + parts[-1][0]).upper()
            else:
                afk = (voornaam[0] + achternaam[:2]).upper()
            afk = afk[:3] + str(teller)  # garanteer uniciteit

            r = s.post(f"{BASE_URL}/docenten", json={
                "magisterCode": afk.upper(),
                "naam": f"{voornaam} {achternaam}",
                "afkorting": afk[:4],
            })
            if r.ok:
                did = r.json()["id"]
                s.put(f"{BASE_URL}/docenten/{did}/vakken", json={"vakIds": [vak_id]})
                docent_ids_per_vak[vak_code].append(did)
            teller += 1

    totaal = sum(len(v) for v in docent_ids_per_vak.values())
    log(f"  {totaal} docenten aangemaakt")
    return docent_ids_per_vak

# ─── LEERLINGEN ──────────────────────────────────────────────────────────────

# Vakken per leerjaar/niveau
VAKKEN_PER_NIVEAU = {
    (1,"mavo"): ["NED","ENG","WIS","GES","AK","BIO","LO","MEN","MU"],
    (2,"mavo"): ["NED","ENG","WIS","GES","AK","BIO","LO","MEN","KUN"],
    (3,"mavo"): ["NED","ENG","WIS","GES","AK","BIO","LO","MEN","EC"],
    (4,"mavo"): ["NED","ENG","WIS","EC","BSM","GES"],
    (1,"havo"): ["NED","ENG","WIS","GES","AK","BIO","NAT","LO","MEN","DUI"],
    (2,"havo"): ["NED","ENG","WIS","GES","AK","BIO","NAT","LO","MEN","DUI"],
    (3,"havo"): ["NED","ENG","WIS","GES","AK","BIO","NAT","SCH","LO","MEN"],
    (4,"havo"): ["NED","ENG","WIS","NAT","SCH","EC","GES"],
    (5,"havo"): ["NED","ENG","WIS","NAT","SCH","EC","GES"],
    (1,"vwo"):  ["NED","ENG","WIS","GES","AK","BIO","NAT","SCH","LO","MEN","DUI"],
    (2,"vwo"):  ["NED","ENG","WIS","GES","AK","BIO","NAT","SCH","LO","MEN","DUI","LAT"],
    (3,"vwo"):  ["NED","ENG","WIS","GES","AK","BIO","NAT","SCH","LO","MEN","LAT","FIL"],
    (4,"vwo"):  ["NED","ENG","WIS","NAT","SCH","BIO","GES","LAT"],
    (5,"vwo"):  ["NED","ENG","WIS","NAT","SCH","BIO","GES","FIL","LAT"],
    (6,"vwo"):  ["NED","ENG","WIS","NAT","SCH","BIO","GES","FIL"],
}

KLASSEN_CONFIG = [
    # (naam, leerjaar, niveau, aantal)
    ("1MA", 1,"mavo",28), ("1MA2",1,"mavo",28),
    ("1HA", 1,"havo",28), ("1HA2",1,"havo",28),
    ("1VW", 1,"vwo", 28), ("1VW2",1,"vwo", 28),
    ("2MA", 2,"mavo",28), ("2MA2",2,"mavo",28),
    ("2HA", 2,"havo",28), ("2HA2",2,"havo",28),
    ("2VW", 2,"vwo", 28), ("2VW2",2,"vwo", 28),
    ("3MA", 3,"mavo",28), ("3MA2",3,"mavo",28),
    ("3HA", 3,"havo",28), ("3HA2",3,"havo",28),
    ("3VW", 3,"vwo", 28), ("3VW2",3,"vwo", 28),
    ("4MA", 4,"mavo",28),
    ("4HA", 4,"havo",28), ("4HA2",4,"havo",28),
    ("4VW", 4,"vwo", 28), ("4VW2",4,"vwo", 28),
    ("5HA", 5,"havo",28), ("5HA2",5,"havo",28),
    ("5VW", 5,"vwo", 28), ("5VW2",5,"vwo", 28),
    ("6VW", 6,"vwo", 28),
]

def maak_leerlingen(vak_ids):
    leerlingen_per_klas = {}
    naam_idx = 0
    stam = 100001

    for klas_naam, leerjaar, niveau, aantal in KLASSEN_CONFIG:
        klas_leerlingen = []
        vakken_codes = VAKKEN_PER_NIVEAU.get((leerjaar, niveau), ["NED","ENG","WIS"])
        vak_id_lijst = [vak_ids[v] for v in vakken_codes if v in vak_ids]

        for _ in range(aantal):
            voornaam = ALLE_VOORNAMEN[naam_idx % len(ALLE_VOORNAMEN)]
            achternaam = ACHTERNAMEN[naam_idx % len(ACHTERNAMEN)]
            naam_idx += 1

            r = s.post(f"{BASE_URL}/leerlingen", json={
                "magisterNummer": f"KC{stam}",
                "naam": f"{voornaam} {achternaam}",
                "klas": klas_naam,
                "leerjaar": leerjaar,
                "niveau": niveau,
            })
            if r.ok:
                lid = r.json()["id"]
                klas_leerlingen.append(lid)
                s.put(f"{BASE_URL}/leerlingen/{lid}/vakken", json={"vakIds": vak_id_lijst})
            stam += 1

        leerlingen_per_klas[klas_naam] = klas_leerlingen

    totaal = sum(len(v) for v in leerlingen_per_klas.values())
    log(f"  {totaal} leerlingen in {len(KLASSEN_CONFIG)} klassen")
    return leerlingen_per_klas

# ─── SE HERKANSINGEN ─────────────────────────────────────────────────────────

SE_VAKKEN = {
    4: {"mavo": ["NED","ENG","WIS","EC","BSM","GES"],
        "havo": ["NED","ENG","WIS","NAT","SCH","EC","GES"],
        "vwo":  ["NED","ENG","WIS","NAT","SCH","BIO","GES","LAT"]},
    5: {"havo": ["NED","ENG","WIS","NAT","SCH","EC","GES"],
        "vwo":  ["NED","ENG","WIS","NAT","SCH","BIO","GES","FIL","LAT"]},
    6: {"vwo":  ["NED","ENG","WIS","NAT","SCH","BIO","GES","FIL"]},
}

def test_se(vak_ids, leerlingen_per_klas):
    log("\n[SE Herkansingen]")
    r = s.post(f"{BASE_URL}/se-roosters", json={
        "naam": "SE Herkansingen Mei 2026",
        "schooljaar": "2025-2026"
    })
    rid = r.json()["id"]

    inschrijvingen = 0
    for klas_naam, lids in leerlingen_per_klas.items():
        leerjaar = int(klas_naam[0])
        niveau = "mavo" if "MA" in klas_naam else ("havo" if "HA" in klas_naam else "vwo")
        vakken_opties = SE_VAKKEN.get(leerjaar, {}).get(niveau)
        if not vakken_opties:
            continue
        for lid in lids:
            gekozen = random.sample(vakken_opties, min(random.randint(2,4), len(vakken_opties)))
            for code in gekozen:
                vak_id = vak_ids.get(code)
                if not vak_id: continue
                r2 = s.post(f"{BASE_URL}/se-roosters/{rid}/inschrijvingen",
                            json={"leerlingId": lid, "vakId": vak_id})
                if r2.ok: inschrijvingen += 1

    log(f"  {inschrijvingen} inschrijvingen")
    t0 = time.time()
    r = s.post(f"{BASE_URL}/se-roosters/{rid}/algoritme/run")
    dt = time.time() - t0
    res = r.json()
    log(f"  Resultaat: {res['aantalLessen']} lessen | {res['aantalIngepland']} ingepland | {res['aantalConflicten']} conflicten | {dt:.1f}s")

    # Toon eerste 8 lessen
    r2 = s.get(f"{BASE_URL}/se-roosters/{rid}")
    dagen = ["","Ma","Di","Wo","Do","Vr"]
    log("  Rooster (eerste lessen):")
    for les in r2.json()["lessen"][:8]:
        dag_str = dagen[les["dag"]] if les["dag"] else "?"
        vak = les["vak"]["code"]
        doc = les["docent"]["afkorting"] if les["docent"] else "-"
        lok = les["lokaal"]["code"] if les["lokaal"] else "-"
        n = len(les["inschrijvingen"])
        log(f"    {dag_str} uur {les['uur']:1d}  {vak:4s}  {doc:5s}  {lok:6s}  ({n} leerlingen)")
    return rid

# ─── TOETSWEEK ───────────────────────────────────────────────────────────────

def test_toetsweek():
    log("\n[Toetsweek Periode 3 — Maart 2026]")
    r = s.post(f"{BASE_URL}/toetsweken", json={
        "naam": "Toetsweek Periode 3 — Maart 2026",
        "schooljaar": "2025-2026",
        "datumVan": "2026-03-23",
        "datumTot": "2026-03-27"
    })
    tid = r.json()["id"]

    r = s.post(f"{BASE_URL}/toetsweken/{tid}/deelnames/genereer", json={})
    log(f"  {r.json()['aangemaakt']} deelnames gegenereerd")

    t0 = time.time()
    r = s.post(f"{BASE_URL}/toetsweken/{tid}/algoritme/run")
    dt = time.time() - t0
    res = r.json()
    log(f"  Resultaat: {res['aantalVakken']} vakken ingepland | {res['aantalConflicten']} conflicten | {dt:.1f}s")

    r2 = s.get(f"{BASE_URL}/toetsweken/{tid}")
    dagen = ["","Maandag","Dinsdag","Woensdag","Donderdag","Vrijdag"]
    dag_vakken = defaultdict(list)
    for les in r2.json()["lessen"]:
        if les["dag"]:
            deelnemers = len(les["deelnames"])
            dag_vakken[les["dag"]].append((les["uur"], les["vak"]["naam"], deelnemers))
    log("  Rooster per dag (unieke vakken):")
    geziene_vakken = set()
    for dag in range(1, 6):
        vakken_dag = dag_vakken.get(dag, [])
        uniek = []
        for uur, naam, n in sorted(vakken_dag):
            if naam not in geziene_vakken:
                uniek.append(f"{naam} ({n} lrl)")
                geziene_vakken.add(naam)
        if uniek:
            log(f"    {dagen[dag]:10s}: {', '.join(uniek)}")
    return tid

# ─── SCHOOLROOSTER ───────────────────────────────────────────────────────────

SCHOOLROOSTER_KLASSEN = [
    ("1HA", 1,"havo", [("NED",4),("ENG",3),("WIS",4),("GES",2),("AK",2),("BIO",2),("NAT",2),("LO",2),("MEN",1),("DUI",3)]),
    ("3MA", 3,"mavo", [("NED",4),("ENG",3),("WIS",3),("GES",2),("AK",2),("BIO",2),("LO",2),("MEN",1),("EC",2)]),
    ("4HA", 4,"havo", [("NED",4),("ENG",3),("WIS",4),("NAT",3),("SCH",3),("EC",3),("GES",2)]),
    ("5HA", 5,"havo", [("NED",4),("ENG",3),("WIS",4),("NAT",3),("SCH",3),("EC",3),("GES",2)]),
    ("4VW", 4,"vwo",  [("NED",4),("ENG",3),("WIS",4),("NAT",4),("SCH",3),("BIO",3),("GES",2),("LAT",2)]),
    ("6VW", 6,"vwo",  [("NED",4),("ENG",3),("WIS",4),("NAT",4),("SCH",3),("BIO",3),("GES",2),("FIL",2)]),
]

def test_schoolrooster(vak_ids, docent_ids_per_vak):
    log("\n[Schoolrooster 2025-2026]")
    r = s.post(f"{BASE_URL}/schoolroosters", json={
        "naam": "Weekrooster 2025-2026 — Krimpenerwaard College",
        "schooljaar": "2025-2026"
    })
    rid = r.json()["id"]

    totaal_slots = 0
    for klas_naam, leerjaar, niveau, lessen in SCHOOLROOSTER_KLASSEN:
        r = s.post(f"{BASE_URL}/schoolroosters/{rid}/klassen", json={
            "naam": klas_naam, "leerjaar": leerjaar, "niveau": niveau, "aantalLeerlingen": 28
        })
        kid = r.json()["id"]
        for vak_code, uren in lessen:
            vak_id = vak_ids.get(vak_code)
            if not vak_id: continue
            s.post(f"{BASE_URL}/schoolroosters/{rid}/klassen/{kid}/lessen",
                   json={"vakId": vak_id, "aantalUurPerWeek": uren})
            totaal_slots += uren

    log(f"  {totaal_slots} slots te plannen voor {len(SCHOOLROOSTER_KLASSEN)} klassen")
    s.post(f"{BASE_URL}/schoolroosters/{rid}/algoritme/run", json={})

    for _ in range(20):
        time.sleep(1)
        st = s.get(f"{BASE_URL}/schoolroosters/{rid}/algoritme/status").json()
        if st["status"] == "klaar":
            log(f"  Klaar | {len(st.get('conflicten',[]))} conflicten")
            break
        elif st["status"] == "fout":
            log(f"  FOUT: {st.get('bericht','?')}")
            break

    # Toon rooster voor 1HA
    r2 = s.get(f"{BASE_URL}/schoolroosters/{rid}")
    slots = r2.json()["slots"]
    klas_1ha = [sl for sl in slots if sl.get("les") and sl["les"].get("klas",{}).get("naam") == "1HA"]
    dag_nemen = ["","Ma","Di","Wo","Do","Vr"]
    log("  Rooster 1HA (voorbeeld):")
    for sl in sorted(klas_1ha, key=lambda x: (x["dag"], x["uur"])):
        vak = sl["les"]["vak"]["code"] if sl["les"] else "?"
        doc = sl["docent"]["afkorting"][:4] if sl.get("docent") else "---"
        lok = sl["lokaal"]["code"] if sl.get("lokaal") else "---"
        log(f"    {dag_nemen[sl['dag']]} uur {sl['uur']}  {vak:4s}  {doc:5s}  {lok}")
    return rid

# ─── OVERZICHT ────────────────────────────────────────────────────────────────

def toon_overzicht():
    leerlingen = s.get(f"{BASE_URL}/leerlingen").json()
    docenten   = s.get(f"{BASE_URL}/docenten").json()
    vakken     = s.get(f"{BASE_URL}/vakken").json()
    lokalen    = s.get(f"{BASE_URL}/lokalen").json()

    log("\n" + "="*60)
    log("  KRIMPENERWAARD COLLEGE — OVERZICHT")
    log("="*60)
    log(f"  Leerlingen : {len(leerlingen)}")
    log(f"  Docenten   : {len(docenten)}")
    log(f"  Vakken     : {len(vakken)}")
    log(f"  Lokalen    : {len(lokalen)}")

    # Klassen
    klassen_count = defaultdict(int)
    for l in leerlingen:
        klassen_count[l["klas"]] += 1
    log(f"\n  Klassen ({len(klassen_count)}):")
    for klas in sorted(klassen_count):
        log(f"    {klas:6s}: {klassen_count[klas]} leerlingen")

    # Sample namen
    log("\n  Voorbeeld leerlingen (willekeurig):")
    for l in random.sample(leerlingen, min(8, len(leerlingen))):
        log(f"    {l['naam']:30s} {l['klas']:6s} {l['niveau']}")

    # Voorbeeld docenten
    log("\n  Voorbeeld docenten:")
    for d in random.sample(docenten, min(6, len(docenten))):
        vakken_doc = ", ".join(v["vak"]["code"] for v in d.get("vakken",[]))
        log(f"    {d['naam']:28s} ({d['afkorting']:4s})  {vakken_doc}")

# ─── MAIN ─────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    log("="*60)
    log("  KRIMPENERWAARD COLLEGE — CASUS OPZETTEN")
    log("="*60)

    setup()

    log("\n[1/4] Basisgegevens")
    t0 = time.time()
    vak_ids = maak_vakken()
    maak_lokalen()
    docent_ids_per_vak = maak_docenten(vak_ids)
    log(f"  Klaar in {time.time()-t0:.1f}s")

    log("\n[2/4] Leerlingen aanmaken (826 in 28 klassen)")
    t0 = time.time()
    leerlingen_per_klas = maak_leerlingen(vak_ids)
    log(f"  Klaar in {time.time()-t0:.1f}s")

    log("\n[3/4] Algoritmes")
    test_se(vak_ids, leerlingen_per_klas)
    test_toetsweek()
    test_schoolrooster(vak_ids, docent_ids_per_vak)

    log("\n[4/4] Resultaten")
    toon_overzicht()

    log("\n" + "="*60)
    log("  CASUS KLAAR — open http://localhost:5173")
    log("="*60)
