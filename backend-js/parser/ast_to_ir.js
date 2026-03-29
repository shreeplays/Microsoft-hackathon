/*
astToIR.js — Parse JS/TS source into Intermediate Representation (IR)

Improved:

- Function level control flow
- Await detection
- Return detection
- Assert detection
- Try / Catch detection
- Nested flow tracking
  */

import parser from "@babel/parser"
import traverse from "@babel/traverse"

export function parseCodeToIR(source){

let ast

try{

    ast = parser.parse(source,{
        sourceType:"module",
        plugins:[
            "typescript",
            "jsx",
            "classProperties",
            "decorators-legacy",
            "dynamicImport"
        ]
    })

}catch(error){

    return emptyIR(error.message)
}

const ir = emptyIR()

traverse.default(ast,{

    // ───── Imports ─────

    ImportDeclaration(path){

        const mod = path.node.source.value.split("/")[0]

        if(!ir.imports.includes(mod)){
            ir.imports.push(mod)
        }
    },


    // ───── Functions ─────

    FunctionDeclaration(path){

        const node = path.node

        const name = node.id?.name || "anonymous"

        const args = node.params.map(p=>p.name || "param")

        const calls = collectCalls(path)

        const control_flow = collectControlFlow(path)

        ir.functions.push({
            name,
            args,
            returns:null,
            calls,
            control_flow,
            decorators:[],
            lineno: node.loc?.start.line || 0,
            is_async: node.async || false
        })
    },


    // Arrow functions

    VariableDeclarator(path){

        if(
            path.node.init &&
            (
                path.node.init.type === "ArrowFunctionExpression" ||
                path.node.init.type === "FunctionExpression"
            )
        ){

            const node = path.node

            const name = node.id.name

            const args = node.init.params.map(p=>p.name || "param")

            const calls = collectCalls(path)

            const control_flow = collectControlFlow(path)

            ir.functions.push({
                name,
                args,
                returns:null,
                calls,
                control_flow,
                decorators:[],
                lineno: node.loc?.start.line || 0,
                is_async: node.init.async || false
            })
        }

    },


    // ───── Classes ─────

    ClassDeclaration(path){

        const node = path.node

        const name = node.id.name

        const bases = node.superClass ? [node.superClass.name] : []

        const methods = []
        const attributes = []

        node.body.body.forEach(child=>{

            if(child.type==="ClassMethod"){
                methods.push(child.key.name)
            }

            if(child.type==="ClassProperty"){
                attributes.push(child.key.name)
            }

        })

        ir.classes.push({
            name,
            bases,
            methods,
            attributes,
            lineno: node.loc?.start.line || 0
        })

    },


    // ───── Global Control Flow ─────

    ForStatement(path){

        ir.control_flow.push({
            type:"for",
            lineno:path.node.loc?.start.line || 0,
            test:"for"
        })

    },

    WhileStatement(path){

        ir.control_flow.push({
            type:"while",
            lineno:path.node.loc?.start.line || 0,
            test:"while"
        })

    },

    IfStatement(path){

        ir.control_flow.push({
            type:"if",
            lineno:path.node.loc?.start.line || 0,
            test:"if"
        })

    },

    TryStatement(path){

        ir.control_flow.push({
            type:"try",
            lineno:path.node.loc?.start.line || 0,
            test:""
        })

    },


    // ───── Top Level Calls ─────

    CallExpression(path){

        if(path.parent.type==="ExpressionStatement"){

            const name = callName(path.node)

            if(name){
                ir.top_level_calls.push(name)
            }

        }

    },


    // ───── Global Vars ─────

    VariableDeclaration(path){

        path.node.declarations.forEach(dec=>{

            if(dec.id?.name){
                ir.global_vars.push(dec.id.name)
            }

        })

    }

})

return ir

}

// ─────────────────────────────────────────────

function emptyIR(error=""){

return {
    functions:[],
    classes:[],
    imports:[],
    top_level_calls:[],
    control_flow:[],
    global_vars:[],
    error
}

}

// ─────────────────────────────────────────────
// Collect Calls

function collectCalls(path){

const calls=[]

path.traverse({

    CallExpression(inner){

        const name = callName(inner.node)

        if(name){
            calls.push(name)
        }

    }

})

return [...new Set(calls)]

}

// ─────────────────────────────────────────────
// Collect Control Flow (NEW)

function collectControlFlow(path){

const control=[]

path.traverse({

    IfStatement(inner){

        control.push({
            type:"if",
            lineno: inner.node.loc?.start.line || 0,
            test:"if"
        })

    },

    ForStatement(inner){

        control.push({
            type:"for",
            lineno: inner.node.loc?.start.line || 0,
            test:"for"
        })

    },

    WhileStatement(inner){

        control.push({
            type:"while",
            lineno: inner.node.loc?.start.line || 0,
            test:"while"
        })

    },

    TryStatement(inner){

        control.push({
            type:"try",
            lineno: inner.node.loc?.start.line || 0,
            test:""
        })

    },

    AwaitExpression(inner){

        const name = callName(inner.node.argument)

        control.push({
            type:"await",
            lineno: inner.node.loc?.start.line || 0,
            test:name || "await"
        })

    },

    ReturnStatement(inner){

        control.push({
            type:"return",
            lineno: inner.node.loc?.start.line || 0,
            test:"return"
        })

    },

    ThrowStatement(inner){

        control.push({
            type:"throw",
            lineno: inner.node.loc?.start.line || 0,
            test:"throw"
        })

    }

})

return control

}

// ─────────────────────────────────────────────

function callName(node){

if(!node) return null

if(node.type==="Identifier"){
    return node.name
}

if(node.type==="MemberExpression"){
    return node.property?.name
}

if(node.type==="CallExpression"){
    return callName(node.callee)
}

return null

}