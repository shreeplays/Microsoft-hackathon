/*
irToGraph.js — Convert IR dict into graph nodes + edges
*/

export function irToGraph(ir){

const nodes = {}
const edges = []

function safeId(name){
return (name || "").replace(/[^a-zA-Z0-9_]/g,"_")
}

const functions = ir.functions || []
const classes = ir.classes || []

// ─────────────────────────────
// FUNCTIONS

functions.forEach(func=>{

const fid = safeId(func.name)

let label = func.name

if(func.args && func.args.length){
    const args = func.args.slice(0,3).join(", ")
    label += `(${args}${func.args.length>3 ? "..." : ""})`
}

nodes[fid] = {
    label,
    type: func.is_async ? "async_function" : "function",
    meta:{
        lineno: func.lineno,
        decorators: func.decorators || []
    }
}


// ───────── Control Flow inside function

if(func.control_flow){

    func.control_flow.forEach((cf,i)=>{

        const cid = fid + "_cf_" + i

        nodes[cid] = {
            label:`${cf.type}: ${(cf.test||"").substring(0,40)}`,
            type:"control",
            meta:{
                lineno: cf.lineno
            }
        }

        // Attach directly to function
        edges.push({
            from: fid,
            to: cid,
            label:""
        })

    })

}


// ───────── Calls inside function

const calls = func.calls || []

calls.forEach((callee,i)=>{

    const callId = fid + "_call_" + i

    nodes[callId] = {
        label:"call " + callee,
        type:"call",
        meta:{}
    }

    edges.push({
        from: fid,
        to: callId,
        label:""
    })

})

})

// ─────────────────────────────
// CALL EDGES BETWEEN FUNCTIONS

const knownFunctions = new Set(
functions.map(f=>safeId(f.name))
)

functions.forEach(func=>{

const fid = safeId(func.name)
const calls = func.calls || []

calls.forEach(callee=>{

    const calleeId = safeId(callee)

    if(
        knownFunctions.has(calleeId) &&
        calleeId !== fid
    ){

        edges.push({
            from: fid,
            to: calleeId,
            label:"calls"
        })

    }

})

})

// ─────────────────────────────
// ENTRY POINT

if(functions.length){

let entry = null

const candidates = [
    "main",
    "main_menu",
    "run",
    "start",
    "app",
]

for(const name of candidates){

    const found = functions.find(f=>f.name === name)

    if(found){
        entry = found
        break
    }

}

if(!entry){
    entry = functions[0]
}

nodes["start"] = {
    label:"Start",
    type:"entry",
    meta:{}
}

edges.push({
    from:"start",
    to:safeId(entry.name),
    label:""
})

}

// ─────────────────────────────
// CLASSES

classes.forEach(cls=>{

const cid = safeId(cls.name)

nodes[cid] = {
    label: cls.name,
    type:"class",
    meta:{
        lineno: cls.lineno,
        methods: cls.methods || [],
        attributes: cls.attributes || []
    }
}

const bases = cls.bases || []

bases.forEach(base=>{

    const baseId = safeId(base)

    if(nodes[baseId]){
        edges.push({
            from: cid,
            to: baseId,
            label:"extends"
        })
    }

})

})

// ─────────────────────────────
// CONTROL FLOW (NO FUNCTIONS)

if(
functions.length===0 &&
classes.length===0
){

const control = ir.control_flow || []

control.forEach((cf,i)=>{

    const cid = `cf_${i}`

    nodes[cid] = {
        label:`${cf.type}: ${(cf.test||"").substring(0,40)}`,
        type:"control",
        meta:{
            lineno: cf.lineno
        }
    }

    if(i>0){
        edges.push({
            from:`cf_${i-1}`,
            to:cid,
            label:""
        })
    }

})

}

// ─────────────────────────────
// EMPTY

if(Object.keys(nodes).length===0){

nodes["start"]={
    label:"Start",
    type:"entry",
    meta:{}
}

nodes["end"]={
    label:"End",
    type:"exit",
    meta:{}
}

edges.push({
    from:"start",
    to:"end",
    label:""
})

}

return {
nodes,
edges
}

}