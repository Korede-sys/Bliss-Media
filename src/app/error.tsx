'use client'
export default function Error({reset}:{error:Error&{digest?:string};reset:()=>void}){return <div className="empty-state not-found"><span>✳</span><h1>A moment of pause.</h1><p>Something didn’t load as expected. Please try again.</p><button className="text-link button-link" onClick={()=>reset()}>Try again →</button></div>}
