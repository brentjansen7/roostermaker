import sys, io, requests, random, time
from collections import defaultdict

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('krimpenerwaard_casus.py', encoding='utf-8') as f:
    code = f.read()

code = code.replace(
    "BASE_URL = 'http://localhost:3001/api'",
    "BASE_URL = 'https://roostermaker-production.up.railway.app/api'"
)
code = code.replace(
    '''def setup():
    r = s.post(f"{BASE_URL}/setup", json={
        "schoolnaam": "Krimpenerwaard College",
        "wachtwoord": "krimpen2026"
    })
    assert r.ok, f"Setup mislukt: {r.text}"
    log("Ingelogd: Krimpenerwaard College (wachtwoord: krimpen2026)")''',
    '''def setup():
    r = s.post(f"{BASE_URL}/login", json={"wachtwoord": "krimpen2026"})
    assert r.ok, f"Login mislukt: {r.text}"
    log("Ingelogd op Railway")'''
)

exec(compile(code, 'krimpenerwaard_casus.py', 'exec'))
