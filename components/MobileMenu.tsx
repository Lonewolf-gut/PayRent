"use client"
import React,{useState} from 'react'
import {AlignLeft} from 'lucide-react'
import SideMenu from './SideMenu'
const MobileMenu = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  return (
    <>
    <button onClick={()=>setIsSidebarOpen(!isSidebarOpen)}>
        <AlignLeft className='hover:text-darkColor hoverEffect md:hidden hover:cursor-pointer '/>
    </button>
    <SideMenu isOpen={isSidebarOpen} onClose ={()=>setIsSidebarOpen(false)}/>
    </>
  )
}

export default MobileMenu

