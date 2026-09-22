'use client'
import React, {createContext,useCallback,useContext,useEffect,useMemo,useState} from 'react'
import {getAuth,onAuthStateChanged} from 'firebase/auth'
import {artApi} from '@/lib/art-api'
import {firebaseApp} from '@/lib/firebase-client'

const Ctx=createContext<any>(null)
export function ArtAdminProvider({children}:{children:React.ReactNode}){
 const [products,setProducts]=useState<any[]>([]),[admin,setAdmin]=useState<any>(null),[isLoading,setLoading]=useState(true),[categories,setCategories]=useState<any[]>([]),[subcategories,setSubcategories]=useState<any>({women:[],men:[],kids:[]}),[siteContent,setSiteContent]=useState<any>({})
 const refreshProducts=useCallback(async()=>{try{setProducts(await artApi.products())}catch{}},[])
 const refreshCategories=useCallback(async()=>{try{setCategories(await artApi.categories())}catch{}},[])
 const refreshSubcategories=useCallback(async()=>{try{const d=await artApi.subcategories();const flat:any={};for(const g of Object.keys(d||{}))flat[g]=(d[g]||[]).map((x:any)=>x.name);setSubcategories(flat)}catch{}},[])
 const refreshSiteContent=useCallback(async()=>{try{setSiteContent(await artApi.siteContent())}catch{}},[])
 useEffect(()=>{const auth=getAuth(firebaseApp);return onAuthStateChanged(auth,async u=>{if(!u){setAdmin(null);setLoading(false);return} try{const me=await artApi.me();setAdmin(me?.admin?{uid:u.uid,...(me||{}),email:u.email,name:me.name||u.displayName||u.email}:null)}catch{setAdmin(null)}finally{setLoading(false)}})},[])
 useEffect(()=>{if(admin){refreshProducts();refreshCategories();refreshSubcategories();refreshSiteContent()}},[admin,refreshProducts,refreshCategories,refreshSubcategories,refreshSiteContent])
 const value=useMemo(()=>({admin,isLoading,isAuthenticated:!!admin,products,categories,subcategories,siteContent,refreshCategories,refreshSubcategories,refreshSiteContent,refreshProducts}),[admin,isLoading,products,categories,subcategories,siteContent,refreshProducts,refreshCategories,refreshSubcategories,refreshSiteContent])
 return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
export const useArtAdmin=()=>useContext(Ctx)
