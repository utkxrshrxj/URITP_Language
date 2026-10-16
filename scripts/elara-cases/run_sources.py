# Checks and runs URITP programs on the playground's own engine (playground/py/bridge.py), as its page does.
# usage: python3 -I run_sources.py PLAYGROUND_CLONE WORK_DIR in.json out.json, where in.json is [{id, world, source}].
import json, os, sys
clone, work, src, dst = sys.argv[1:5]
os.environ["URITP_PLAY_WORLDS"] = os.path.join(clone, "playground", "worlds")
os.environ["URITP_PLAY_WORK"] = work
sys.path[:0] = [os.path.join(clone, "playground", "py"), clone]
import bridge
out = []
for item in json.load(open(src, encoding="utf-8")):
    r = json.loads(bridge.call("run", json.dumps({"world": item["world"], "source": item["source"]})))
    out.append({**item, **r})
json.dump(out, open(dst, "w", encoding="utf-8"), ensure_ascii=False)
