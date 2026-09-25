#!/usr/bin/env python3
"""Create a portable source ZIP; excludes dependencies, secrets and runtime data."""
import json,sys,zipfile
from pathlib import Path
root=Path(__file__).resolve().parents[1]
output=Path(sys.argv[1]).resolve();output.parent.mkdir(parents=True,exist_ok=True)
skip_parts={'.git','node_modules','.next','dist','.sites-runtime','.wrangler','__pycache__'}
count=0
with zipfile.ZipFile(output,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for f in sorted(root.rglob('*')):
  if not f.is_file():continue
  rel=f.relative_to(root)
  if any(p in skip_parts for p in rel.parts) or rel.parts[0]=='uploads':continue
  if f.name.startswith('.env') and f.name!='.env.example':continue
  if f.suffix in {'.log','.zip','.tar','.gz'}:continue
  if str(rel)=='.openai/hosting.json':
   z.writestr('bg-elevators-cms/'+str(rel),json.dumps({'d1':'DB','r2':'BUCKET'},indent=2));count+=1;continue
  z.write(f,'bg-elevators-cms/'+str(rel));count+=1
with zipfile.ZipFile(output) as z:
 assert z.testzip() is None
 required=['README.md','.env.example','package-lock.json','apps/storefront/package.json','apps/admin/src/App.jsx','apps/api/src/server.js','packages/content/seed.json','docs/DEPLOYMENT.md']
 for f in required:assert 'bg-elevators-cms/'+f in z.namelist(),f
print(json.dumps({'path':str(output),'files':count,'bytes':output.stat().st_size}))
