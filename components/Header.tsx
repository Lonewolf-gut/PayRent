import React from 'react'
import Container from './Container'
import Logo from './Logo'
import HeaderMenu from './HeaderMenu'
import Searchbar from './Searchbar'
import Favoritebutton from './Favoritebutton'
import Cardicon from './Cardicon'
import SignIn from './SignIn'
import MobileMenu from './MobileMenu'
function Header() {
  return (
    <header className='bg-white py-5 border-b border-b-black/20'>
      <Container className='flex items-center justify-between'>
        <div className='w-auto md:w-1/3 flex items-center gap-2.5 md:gap-0'>
         <MobileMenu/>
            <Logo/>
           
        </div>
        
        <HeaderMenu/>
        <div className="w-auto md:1/3 flex items-center justify-end gap-5"> 
            <Searchbar/>
            <Cardicon/>
            <Favoritebutton/>
            <SignIn/>
        </div>
       
      </Container>
    </header>
  )
}

export default Header
