import { Suspense, useState, useEffect, useRef } from 'react'
import { useLoaderData, defer, Form, Await, useRouteError, Link, useNavigate } from 'react-router-dom'
import { Title } from './helper/DocumentTitle'
import MaterialIcon from './helper/MaterialIcon'
import Shimmer from './helper/Shimmer'
import toast, { Toaster } from 'react-hot-toast'
import { useAuth, web3, _ } from '../contexts/AuthContext'
import Caveman from './../../src/assets/caveman.png'
import Web3 from 'web3'
import ABI from '../abi/luckybet.json'
import party from 'party-js'
import WelcomeBox from './../../src/assets/welcome-box.png'
import DappDefaultIcon from './../assets/dapp-default-icon.svg'
import styles from './Pools.module.scss'

party.resolvableShapes['UP'] = `<img src="http://localhost:5173/src/assets/up-logo.svg"/>`
party.resolvableShapes['Lukso'] = `<img src="http://localhost:5173/src/assets/lukso-logo.svg"/>`

const WhitelistFactoryAddr = web3.utils.padLeft(`0x2`, 64)

export const loader = async () => {
  return defer({ key: 'val' })
}

function Pools({ title }) {
  Title(title)
  const [loaderData, setLoaderData] = useState(useLoaderData())
  const [isLoading, setIsLoading] = useState(true)
  const [pools, setPools] = useState([])
  const [app, setApp] = useState([])
  const [backApp, setBackupApp] = useState([])
  const [whitelist, setWhitelist] = useState()
  const [recentApp, setRecentApp] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [modalContent, setModalContent] = useState('')
  const auth = useAuth()
  const navigate = useNavigate()
  const txtSearchRef = useRef()

  const addMe = async () => {
    const t = toast.loading(`Loading`)
    try {
      web3.eth.defaultAccount = auth.wallet

      const whitelistFactoryContract = new web3.eth.Contract(ABI, import.meta.env.VITE_WHITELISTFACTORY_CONTRACT_MAINNET, {
        from: auth.wallet,
      })
      console.log(whitelistFactoryContract.defaultChain, Date.now())
      await whitelistFactoryContract.methods
        .addUser(WhitelistFactoryAddr)
        .send()
        .then((res) => {
          console.log(res)
          toast.dismiss(t)
          toast.success(`You hav been added to the list.`)
          party.confetti(document.querySelector(`h4`), {
            count: party.variation.range(20, 40),
          })
        })
    } catch (error) {
      console.error(error)
      toast.dismiss(t)
    }
  }

  const addUserByManager = async () => {
    const t = toast.loading(`Loading`)
    try {
      web3.eth.defaultAccount = auth.wallet

      const whitelistFactoryContract = new web3.eth.Contract(ABI, import.meta.env.VITE_WHITELISTFACTORY_CONTRACT_MAINNET, {
        from: auth.wallet,
      })

      await whitelistFactoryContract.methods
        .addUserByManager(WhitelistFactoryAddr)
        .send()
        .then((res) => {
          console.log(res)
          toast.dismiss(t)
          toast.success(`You hav been added to the list.`)
          party.confetti(document.querySelector(`h4`), {
            count: party.variation.range(20, 40),
          })
        })
    } catch (error) {
      console.error(error)
      toast.dismiss(t)
    }
  }

  const updateWhitelist = async () => {
    web3.eth.defaultAccount = `0x188eeC07287D876a23565c3c568cbE0bb1984b83`

    const whitelistFactoryContract = new web3.eth.Contract('', `0xc407722d150c8a65e890096869f8015D90a89EfD`, {
      from: '0x188eeC07287D876a23565c3c568cbE0bb1984b83', // default from address
      gasPrice: '20000000000',
    })
    console.log(whitelistFactoryContract.defaultChain, Date.now())
    await whitelistFactoryContract.methods
      .updateWhitelist(web3.utils.utf8ToBytes(1), `q1q1q1q1`, false)
      .send()
      .then((res) => {
        console.log(res)
      })
  }

  const createWhitelist = async () => {
    console.log(auth.wallet)
    web3.eth.defaultAccount = auth.wallet

    const whitelistFactoryContract = new web3.eth.Contract(ABI, import.meta.env.VITE_WHITELISTFACTORY_CONTRACT_MAINNET)
    await whitelistFactoryContract.methods
      .addWhitelist(``, Date.now(), 1710102205873, `0x0D5C8B7cC12eD8486E1E0147CC0c3395739F138d`, [])
      .send({ from: auth.wallet })
      .then((res) => {
        console.log(res)
      })
  }

  const handleSearch = async () => {
    let dataFilter = app
    if (txtSearchRef.current.value !== '') {
      let filteredData = dataFilter.filter((item) => item.name.toLowerCase().includes(txtSearchRef.current.value.toLowerCase()))
      if (filteredData.length > 0) setApp(filteredData)
    } else setApp(backApp)
  }

  const fetchIPFS = async (CID) => {
    try {
      const response = await fetch(`https://api.universalprofile.cloud/ipfs/${CID}`)
      if (!response.ok) throw new Response('Failed to get data', { status: 500 })
      const json = await response.json()
      // console.log(json)
      return json
    } catch (error) {
      console.error(error)
    }

    return false
  }

  const getPoolList = async () => {
    web3.eth.defaultAccount = auth.wallet
    const contract = new web3.eth.Contract(ABI, import.meta.env.VITE_LUCKYBET_CONTRACT_TESTNET)
    return await contract.methods.pool(0).call()
  }

  const getLike = async (appId) => {
    let web3 = new Web3(import.meta.env.VITE_RPC_URL)
    const UpstoreContract = new web3.eth.Contract(ABI, import.meta.env.VITE_LUCKYBET_CONTRACT_MAINNET)
    return await UpstoreContract.methods.getLikeTotal(appId).call()
  }

  const handleRemoveRecentApp = async (e, appId) => {
    localStorage.setItem('appSeen', JSON.stringify(recentApp.filter((reduceItem) => reduceItem.appId !== appId)))

    // Refresh the recent app list
    getRecentApp().then((res) => {
      setRecentApp(res)
    })
  }

  const getRecentApp = async () => {
    return await JSON.parse(localStorage.getItem(`appSeen`))
  }

  const handleShowModal = (action) => {
    setShowModal((showModal) => !showModal)
    switch (action) {
      case 'rules':
        setModalContent(
          `After a successful test of the alpha and beta versions of Lucky Bet, management will work closely with legal counsel to navigate complex regulatory environments and mitigate legal risks. Moving forward, game administrators will stay informed about changes in gambling regulations globally and adapt strategies accordingly.`
        )
        break
      case 'about':
        setModalContent(
          `Lucky Bet is an international blockchain-based lottery game operating on the LUSKO blockchain. It serves as a community-building activity to 1. Support development projects and 2. a gateway that introduces blockchain-based games to the general crypto token-holding public. It also helps to demystify complex concepts and foster broader adoption of blockchain-based applications.`
        )
        break
      default:
        setModalContent(`Unknown`)
        break
    }
  }

  useEffect(() => {
    getPoolList().then(async (res) => {
      console.log(res)
      setPools([res])
      setIsLoading(false)
    })
  }, [])

  return (
    <>
      <section className={styles.section}>
        <div className={`__container h-inherit d-flex flex-column align-items-center justify-content-start pt-80`} data-width={`large`}>
          <div className={`d-flex flex-column align-items-center justify-content-center mt-10`}>
          <figure className={`mb-40`}>
            <img src={WelcomeBox}/>
          </figure>
          
            {pools.map((item, i) => (
              <Link key={i} to={`/play/${item.id}`}>
                {item.metadata}
              </Link>
            ))}
          </div>
          <figure className={`${styles['caveman']}`}>
            <img alt={`Caveman`} src={Caveman} />
            <div className={`${styles['bubble']}`}>Me Want Gold Rush</div>
          </figure>
        </div>
      </section>
    </>
  )
}

export default Pools
