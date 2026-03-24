#!/usr/bin/env python3
"""
Grootschalige test: Krimpenerwaard College
- 20 vakken
- 33 lokalen
- 80 docenten
- 784 leerlingen in 28 klassen
- SE herkansingen, toetsweek, schoolrooster algoritmes
"""
import requests
import random
import sys
import time

BASE_URL = "http://localhost:3001/api"
s = requests.Session()
random.seed(42)

VOORNAMEN = [
    "Adam","Bo","Casper","Demi","Erik","Fien","Gijs","Hannah","Ivo","Julia",
    "Kevin","Laura","Maarten","Noor","Oscar","Pleun","Quinten","Rosa","Sander","Tessa",
    "Victor","Wendy","Xander","Yvonne","Zander","Amy","Bas","Charlotte","David","Emma",
    "Floris","Gina","Hamid","Iris","Jan","Kiki","Lars","Manon","Niels","Olivia",
    "Pieter","Quinn","Ruben","Sara","Thomas","Uma","Vera","Wesley","Xenia","Yorick",
]
ACHTERNAMEN = [
    "Bakker","de Boer","Bos","Brouwer","de Bruijn","Dekker","Dijkstra","van Dijk",
    "Hendriks","Jacobs","Janssen","de Jong","Kuipers","Leeuw","Meijer","Mulder",
    "Peters","Smit","Smits","van der Berg","Vos","de Vries","Willems","van Dam",
    "Visser","Vermeulen","Hoekstra","Blom","Groot","Koning","Kok","Maas","Prins",
    "Huisman","Post","Wolff","van den Berg","Langen","Snel","van Leeuwen",
]
DOCENT_VOORNAMEN = [
    "Anna","Bert","Carla","Dirk","Els","Frank","Greet","Herman","Inge","Jan",
    "Karin","Leo","Miriam","Nils","Olga","Pim","Roos","Stefan","Tineke","Udo",
    "Vera","Wim","Xandra","Yvette","Zeger","Ad","Bea","Cor","Daan","Eef",
]

def log(msg):
    print(msg.encode('ascii', errors='replace').decode('ascii'), flush=True)

def login():
    r = s.post(f"{BASE_URL}/login", json={"wachtwoord": "Brent"})
    if not r.ok:
        log(f"LOGIN MISLUKT: {r.text}")
        sys.exit(1)
    log("✓ Ingelogd als Krimpenerwaard College")

def maak_vakken():
    vakken_lijst = [
        ("NED","Nederlands"),("ENG","Engels"),("DUI","Duits"),("FRA","Frans"),
        ("WIS","Wiskunde"),("NAT","Natuurkunde"),("SCH","Scheikunde"),("BIO","Biologie"),
        ("GES","Geschiedenis"),("AK","Aardrijkskunde"),("EC","Economie"),
        ("BSM","Bedrijfseconomie"),("KUN","Kunst en Cultuur"),("LO","Lichamelijke Opvoeding"),
        ("MEN","Maatschappijleer"),("INF","Informatica"),("ANW","Alg. Natuurwetenschappen"),
        ("FIL","Filosofie"),("LAT","Latijn"),("MU","Muziek"),
    ]
    ids = {}
    for code, naam in vakken_lijst:
        r = s.post(f"{BASE_URL}/vakken", json={"code": code, "naam": naam})
        if r.ok:
            ids[code] = r.json()["id"]
    # Fetch any existing
    r = s.get(f"{BASE_URL}/vakken")
    if r.ok:
        for v in r.json():
            ids[v["code"]] = v["id"]
    log(f"✓ {len(ids)} vakken")
    return ids

def maak_lokalen():
    lokalen = []
    for wing in ["A","B"]:
        for num in range(1, 13):
            lokalen.append({"code": f"{wing}{num:02d}", "naam": f"Lokaal {wing}{num:02d}", "capaciteit": 30, "type": "normaal"})
    for i in range(1, 5):
        lokalen.append({"code": f"GYM{i}", "naam": f"Gymzaal {i}", "capaciteit": 35, "type": "gym"})
    for i in range(1, 4):
        lokalen.append({"code": f"LAB{i}", "naam": f"Laboratorium {i}", "capaciteit": 28, "type": "lab"})
    for i in range(1, 3):
        lokalen.append({"code": f"ICT{i}", "naam": f"ICT-lokaal {i}", "capaciteit": 30, "type": "ict"})
    aangemaakt = 0
    for l in lokalen:
        r = s.post(f"{BASE_URL}/lokalen", json=l)
        if r.ok:
            aangemaakt += 1
    log(f"✓ {aangemaakt} lokalen")

def maak_docenten(vak_ids):
    # Per vak: aantal docenten  (totaal ~80)
    vak_aantallen = {
        "NED":5,"ENG":5,"WIS":5,"BIO":4,"NAT":4,"SCH":3,
        "GES":3,"AK":3,"EC":3,"DUI":3,"FRA":3,"LO":5,
        "KUN":3,"MEN":2,"INF":3,"LAT":2,"BSM":2,"FIL":2,
        "ANW":2,"MU":2,
    }
    docent_ids_per_vak = {}
    naam_idx = 0
    ach_idx = 0
    teller = 1
    for vak_code, aantal in vak_aantallen.items():
        vak_id = vak_ids.get(vak_code)
        if not vak_id:
            continue
        docent_ids_per_vak[vak_code] = []
        for _ in range(aantal):
            voornaam = DOCENT_VOORNAMEN[naam_idx % len(DOCENT_VOORNAMEN)]
            achternaam = ACHTERNAMEN[ach_idx % len(ACHTERNAMEN)]
            naam_idx += 1
            ach_idx += 5  # skip zodat afkortingen minder botsen
            afk = f"{voornaam[0]}{achternaam.replace(' ','')[:2].upper()}{teller:02d}"[:4]
            mag = f"{voornaam[0].upper()}{achternaam.replace(' ','').upper()[:3]}{teller}"
            r = s.post(f"{BASE_URL}/docenten", json={
                "magisterCode": mag, "naam": f"{voornaam} {achternaam}", "afkorting": afk
            })
            if r.ok:
                did = r.json()["id"]
                s.put(f"{BASE_URL}/docenten/{did}/vakken", json={"vakIds": [vak_id]})
                docent_ids_per_vak[vak_code].append(did)
            teller += 1
    totaal = sum(len(v) for v in docent_ids_per_vak.values())
    log(f"✓ {totaal} docenten")
    return docent_ids_per_vak

def maak_leerlingen(vak_ids):
    klassen_config = [
        ("1MA1",1,"mavo",28),("1MA2",1,"mavo",28),
        ("1HA1",1,"havo",28),("1HA2",1,"havo",28),
        ("1VW1",1,"vwo", 28),("1VW2",1,"vwo", 28),
        ("2MA1",2,"mavo",28),("2MA2",2,"mavo",28),
        ("2HA1",2,"havo",28),("2HA2",2,"havo",28),
        ("2VW1",2,"vwo", 28),("2VW2",2,"vwo", 28),
        ("3MA1",3,"mavo",28),("3MA2",3,"mavo",28),
        ("3HA1",3,"havo",28),("3HA2",3,"havo",28),
        ("3VW1",3,"vwo", 28),("3VW2",3,"vwo", 28),
        ("4MA1",4,"mavo",28),
        ("4HA1",4,"havo",28),("4HA2",4,"havo",28),
        ("4VW1",4,"vwo", 28),("4VW2",4,"vwo", 28),
        ("5HA1",5,"havo",28),("5HA2",5,"havo",28),
        ("5VW1",5,"vwo", 28),("5VW2",5,"vwo", 28),
        ("6VW1",6,"vwo", 28),
    ]

    # Vakken per niveau: welke vakken koppelen we aan leerlingen
    VAKKEN_PER_NIVEAU = {
        1: {"mavo":["NED","ENG","WIS","GES","AK","BIO","NAT","LO","MEN"],
            "havo":["NED","ENG","WIS","GES","AK","BIO","NAT","SCH","LO","MEN"],
            "vwo": ["NED","ENG","WIS","GES","AK","BIO","NAT","SCH","LO","MEN"]},
        2: {"mavo":["NED","ENG","WIS","GES","AK","BIO","NAT","LO","MEN"],
            "havo":["NED","ENG","WIS","GES","AK","BIO","NAT","SCH","LO","MEN"],
            "vwo": ["NED","ENG","WIS","GES","AK","BIO","NAT","SCH","LAT","LO","MEN"]},
        3: {"mavo":["NED","ENG","WIS","GES","AK","BIO","LO","MEN","EC"],
            "havo":["NED","ENG","WIS","GES","AK","BIO","NAT","SCH","LO","MEN"],
            "vwo": ["NED","ENG","WIS","GES","AK","BIO","NAT","SCH","LAT","FIL","LO","MEN"]},
        4: {"mavo":["NED","ENG","WIS","EC","GES","BIO"],
            "havo":["NED","ENG","WIS","EC","NAT","GES","SCH"],
            "vwo": ["NED","ENG","WIS","NAT","SCH","BIO","GES","LAT"]},
        5: {"havo":["NED","ENG","WIS","EC","NAT","GES","SCH"],
            "vwo": ["NED","ENG","WIS","NAT","SCH","BIO","GES","FIL","LAT"]},
        6: {"vwo": ["NED","ENG","WIS","NAT","SCH","BIO","GES","FIL"]},
    }

    leerlingen_per_klas = {}
    naam_idx = 0
    stam = 20001

    for klas_naam, leerjaar, niveau, aantal in klassen_config:
        klas_leerlingen = []
        vakken_opties = VAKKEN_PER_NIVEAU.get(leerjaar, {}).get(niveau, ["NED","ENG","WIS"])
        vak_id_lijst = [vak_ids[v] for v in vakken_opties if v in vak_ids]

        for _ in range(aantal):
            vnaam = VOORNAMEN[naam_idx % len(VOORNAMEN)]
            anaam = ACHTERNAMEN[naam_idx % len(ACHTERNAMEN)]
            naam_idx += 1
            r = s.post(f"{BASE_URL}/leerlingen", json={
                "magisterNummer": f"S{stam}",
                "naam": f"{vnaam} {anaam}",
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
    log(f"✓ {totaal} leerlingen in {len(klassen_config)} klassen")
    return leerlingen_per_klas

def test_se_rooster(vak_ids, leerlingen_per_klas):
    log("\n--- SE Herkansingen ---")
    r = s.post(f"{BASE_URL}/se-roosters", json={
        "naam": "SE Herkansingen Mei 2026 - Krimpenerwaard College",
        "schooljaar": "2025-2026"
    })
    if not r.ok:
        log(f"  FOUT: {r.text}"); return
    rid = r.json()["id"]

    # SE vakken per leerjaar
    SE_VAKKEN = {
        "4": ["NED","ENG","WIS","EC","GES","BIO"],
        "5": ["NED","ENG","WIS","NAT","EC","SCH"],
        "6": ["NED","ENG","WIS","NAT","SCH","BIO","GES"],
    }

    inschrijvingen = 0
    for klas_naam, lids in leerlingen_per_klas.items():
        ljaar = klas_naam[0]
        if ljaar not in SE_VAKKEN:
            continue
        vk = SE_VAKKEN[ljaar]
        for lid in lids:
            gekozen = random.sample(vk, random.randint(2, 3))
            for code in gekozen:
                vak_id = vak_ids.get(code)
                if not vak_id: continue
                r = s.post(f"{BASE_URL}/se-roosters/{rid}/inschrijvingen",
                           json={"leerlingId": lid, "vakId": vak_id})
                if r.ok:
                    inschrijvingen += 1

    log(f"  {inschrijvingen} inschrijvingen aangemaakt")
    t0 = time.time()
    r = s.post(f"{BASE_URL}/se-roosters/{rid}/algoritme/run")
    dt = time.time() - t0
    if r.ok:
        res = r.json()
        log(f"  ✓ {res['aantalLessen']} lessen | {res['aantalIngepland']} ingepland | {res['aantalConflicten']} conflicten | {dt:.1f}s")
    else:
        log(f"  FOUT: {r.text[:300]}")
    return rid

def test_toetsweek():
    log("\n--- Toetsweek ---")
    r = s.post(f"{BASE_URL}/toetsweken", json={
        "naam": "Toetsweek Juni 2026 - Krimpenerwaard College",
        "schooljaar": "2025-2026",
        "datumVan": "2026-06-01",
        "datumTot": "2026-06-05"
    })
    if not r.ok:
        log(f"  FOUT: {r.text}"); return
    tid = r.json()["id"]

    r = s.post(f"{BASE_URL}/toetsweken/{tid}/deelnames/genereer", json={})
    if r.ok:
        log(f"  {r.json()['aangemaakt']} deelnames gegenereerd")

    t0 = time.time()
    r = s.post(f"{BASE_URL}/toetsweken/{tid}/algoritme/run")
    dt = time.time() - t0
    if r.ok:
        res = r.json()
        log(f"  ✓ {res['aantalVakken']} vakken ingepland | {res['aantalConflicten']} conflicten | {dt:.1f}s")
    else:
        log(f"  FOUT: {r.text[:300]}")
    return tid

def test_schoolrooster(vak_ids, docent_ids_per_vak):
    log("\n--- Schoolrooster (5 klassen als steekproef) ---")
    r = s.post(f"{BASE_URL}/schoolroosters", json={
        "naam": "Schoolrooster 2025-2026 - Krimpenerwaard College",
        "schooljaar": "2025-2026"
    })
    if not r.ok:
        log(f"  FOUT: {r.text}"); return
    rid = r.json()["id"]

    LESSEN = {
        "mavo": [("NED",3),("ENG",3),("WIS",4),("GES",2),("AK",2),("EC",3),("LO",2)],
        "havo": [("NED",3),("ENG",3),("WIS",4),("NAT",3),("SCH",3),("EC",3),("LO",2)],
        "vwo":  [("NED",3),("ENG",3),("WIS",4),("NAT",4),("SCH",3),("GES",3),("LAT",2),("LO",2)],
    }
    klassen = [
        ("4MA1",4,"mavo"),("5HA1",5,"havo"),("5HA2",5,"havo"),
        ("5VW1",5,"vwo"),("6VW1",6,"vwo"),
    ]

    totaal_slots = 0
    for klas_naam, leerjaar, niveau in klassen:
        r = s.post(f"{BASE_URL}/schoolroosters/{rid}/klassen", json={
            "naam": klas_naam, "leerjaar": leerjaar, "niveau": niveau, "aantalLeerlingen": 28
        })
        if not r.ok: continue
        kid = r.json()["id"]
        for vak_code, uren in LESSEN[niveau]:
            vak_id = vak_ids.get(vak_code)
            if not vak_id: continue
            r2 = s.post(f"{BASE_URL}/schoolroosters/{rid}/klassen/{kid}/lessen",
                        json={"vakId": vak_id, "aantalUurPerWeek": uren})
            if r2.ok:
                totaal_slots += uren

    log(f"  {totaal_slots} te plannen slots")
    s.post(f"{BASE_URL}/schoolroosters/{rid}/algoritme/run", json={})
    log("  Algoritme gestart, wacht op resultaat...")

    t0 = time.time()
    for _ in range(15):
        time.sleep(1)
        r = s.get(f"{BASE_URL}/schoolroosters/{rid}/algoritme/status")
        if r.ok:
            st = r.json()
            if st["status"] == "klaar":
                dt = time.time() - t0
                log(f"  ✓ Klaar | {st.get('percent',100)}% | {len(st.get('conflicten',[]))} conflicten | {dt:.1f}s")
                return rid
            elif st["status"] == "fout":
                log(f"  FOUT: {st.get('bericht','onbekend')}")
                return rid
    log("  Timeout na 15s")
    return rid

# ─── MAIN ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    log("=" * 60)
    log("  KRIMPENERWAARD COLLEGE — GROOTSCHALIGE TEST")
    log("=" * 60)

    login()

    log("\n[1/4] Basisgegevens aanmaken")
    t0 = time.time()
    vak_ids = maak_vakken()
    maak_lokalen()
    docent_ids_per_vak = maak_docenten(vak_ids)
    log(f"  Klaar in {time.time()-t0:.1f}s")

    log("\n[2/4] 784 leerlingen aanmaken (28 klassen × 28)")
    t0 = time.time()
    leerlingen_per_klas = maak_leerlingen(vak_ids)
    log(f"  Klaar in {time.time()-t0:.1f}s")

    log("\n[3/4] Algoritmes testen")
    test_se_rooster(vak_ids, leerlingen_per_klas)
    test_toetsweek()
    test_schoolrooster(vak_ids, docent_ids_per_vak)

    log("\n" + "=" * 60)
    log("  TEST VOLTOOID")
    log("=" * 60)
