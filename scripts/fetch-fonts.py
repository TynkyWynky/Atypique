"""Download the project's font families from Google Fonts for local hosting."""
from pathlib import Path
import re
import urllib.request

root = Path(__file__).resolve().parent.parent
target = root / 'fonts'
target.mkdir(exist_ok=True)
url = 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&family=IBM+Plex+Mono:wght@400&family=Instrument+Sans:wght@400..700&display=swap'
request = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'})
css = urllib.request.urlopen(request).read().decode()
blocks = []
for label, block in re.findall(r'/\* ([^*]+) \*/\s*(@font-face\s*\{[^}]+\})', css):
    if label.strip() not in ('latin', 'latin-ext'):
        continue
    family = re.search(r"font-family: '([^']+)'", block).group(1)
    remote = re.search(r'url\(([^)]+)\)', block).group(1)
    name = family.lower().replace(' ', '-') + '-' + label.strip() + '.woff2'
    (target / name).write_bytes(urllib.request.urlopen(remote).read())
    blocks.append(block.replace(remote, '../fonts/' + name))
if not blocks:
    raise RuntimeError('No WOFF2 font subsets returned')
(root / 'css/fonts.css').write_text('\n\n'.join(blocks) + '\n', encoding='utf-8')
for family, folder in [('Bricolage Grotesque', 'bricolagegrotesque'), ('Instrument Sans', 'instrumentsans'), ('IBM Plex Mono', 'ibmplexmono')]:
    license_url = f'https://raw.githubusercontent.com/google/fonts/main/ofl/{folder}/OFL.txt'
    (target / (family.lower().replace(' ', '-') + '-OFL.txt')).write_bytes(urllib.request.urlopen(license_url).read())
print('Downloaded local WOFF2 subsets and font licenses.')
