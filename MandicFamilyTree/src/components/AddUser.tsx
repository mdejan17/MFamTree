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
          <li>First Name <input type="firstName" /></li>
          <li>Last Namee <input type="lastName" /></li>
        </ul>
        <button onClick={(e) => addUserHandler(e)}>Add User</button>
      </div>
      </>
    )
}
export default AddUser