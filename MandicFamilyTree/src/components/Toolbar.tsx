import './modules/Toolbar.css'
import profilePic from '../assets/placeholder.jpeg'
function Toolbar() {

    return (
        <>
        <div className='toolbar'>
            <img src={profilePic} alt=""  className='toolbarPhoto'/>
            <div className='toolbarInfo'>
                <p>Lorem, ipsum dolor sit amet consectetur adipisicing elit. Quasi culpa illum laborum deleniti recusandae iure itaque magnam dolorum aut, eaque corrupti dolore alias fugiat, veritatis dignissimos quidem minima voluptatum nostrum.</p>
            </div>
            <ul>
                <li>Person Profile</li>
                <li>Focus</li>
                <li>Add Offspring</li>
                <li>Gallery</li>
            </ul>
            <div className='toolbarGallery'>
                {/* funtion that generates the galery */}
                <img src={profilePic} alt="" className='toolbarGalleryPhoto'/>

                <img src={profilePic} alt="" className='toolbarGalleryPhoto'/>
                <img src={profilePic} alt="" className='toolbarGalleryPhoto'/>
                <img src={profilePic} alt="" className='toolbarGalleryPhoto'/>
                <img src={profilePic} alt="" className='toolbarGalleryPhoto'/>
                <img src={profilePic} alt="" className='toolbarGalleryPhoto'/>
                <img src={profilePic} alt="" className='toolbarGalleryPhoto'/>
                <img src={profilePic} alt="" className='toolbarGalleryPhoto'/>
                <img src={profilePic} alt="" className='toolbarGalleryPhoto'/>
                <img src={profilePic} alt="" className='toolbarGalleryPhoto'/>
                <img src={profilePic} alt="" className='toolbarGalleryPhoto'/>
                <img src={profilePic} alt="" className='toolbarGalleryPhoto'/>
                <img src={profilePic} alt="" className='toolbarGalleryPhoto'/>
                <img src={profilePic} alt="" className='toolbarGalleryPhoto'/>
                <img src={profilePic} alt="" className='toolbarGalleryPhoto'/>
                <img src={profilePic} alt="" className='toolbarGalleryPhoto'/>
                <img src={profilePic} alt="" className='toolbarGalleryPhoto'/>

                <img src={profilePic} alt="" className='toolbarGalleryPhoto'/>
                <img src={profilePic} alt="" className='toolbarGalleryPhoto'/>
                <img src={profilePic} alt="" className='toolbarGalleryPhoto'/>
                <img src={profilePic} alt="" className='toolbarGalleryPhoto'/>
                <img src={profilePic} alt="" className='toolbarGalleryPhoto'/>
                <img src={profilePic} alt="" className='toolbarGalleryPhoto'/>
                <img src={profilePic} alt="" className='toolbarGalleryPhoto'/>
                <img src={profilePic} alt="" className='toolbarGalleryPhoto'/>
                <img src={profilePic} alt="" className='toolbarGalleryPhoto'/>
                <img src={profilePic} alt="" className='toolbarGalleryPhoto'/>

            </div>
        </div>
        </>
    )
}

export default Toolbar