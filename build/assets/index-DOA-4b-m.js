import{c as u,r as t,a6 as s,o as c}from"./index-DYCdECr2.js";/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const d=u("ChevronDown",[["path",{d:"m6 9 6 6 6-6",key:"qrunsl"}]]);var a=s[" useId ".trim().toString()]||(()=>{}),i=0;function p(r){const[e,o]=t.useState(a());return c(()=>{o(n=>n??String(i++))},[r]),r||(e?`radix-${e}`:"")}var v=t.createContext(void 0);function x(r){const e=t.useContext(v);return r||e||"ltr"}function C(r){const e=t.useRef({value:r,previous:r});return t.useMemo(()=>(e.current.value!==r&&(e.current.previous=e.current.value,e.current.value=r),e.current.previous),[r])}export{d as C,x as a,C as b,p as u};
