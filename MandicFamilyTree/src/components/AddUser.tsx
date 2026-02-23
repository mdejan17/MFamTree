import styles from './modules/AddUser.module.css'
function AddUser() {

  function addUserHandler(e:any) {
    console.log("User added handler");
    (document.getElementsByClassName(styles.popup) as HTMLCollectionOf<HTMLElement>)[0].style.display='none';
    (document.getElementsByClassName(styles.overlay) as HTMLCollectionOf<HTMLElement>)[0].style.display='none';
  }
    return(
      <>
        <div className={styles.overlay}></div>
        <div className={styles.popup} id='addUserPopup'>
        <h1>Add User</h1>
        <ul>
          <li><input type="firstName" placeholder='First Name' /></li>
          <li><input type="lastName" placeholder='Last Name'/></li>
          <li><input type="maidenName" placeholder='Maiden Name' /></li>
          <li><input type="dateOfBirth" placeholder='Date of Birth'/></li>
          <li><input type="dateOfDeath" placeholder='Date of Death' /></li>
          <li><input type="residency" placeholder='Residency'/></li>
          <li><input type="description" placeholder='Description' /></li>

        </ul>
        <button onClick={(e) => addUserHandler(e)}>Add Person</button>
      </div>
      </>
    )
}
export default AddUser