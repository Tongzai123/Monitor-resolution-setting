import React, { memo, useEffect, useMemo, useState } from "react";
import Slider from "./Slider";
import DDCCISliders from "./DDCCISliders"
import HDRSliders from "./HDRSliders";
import TranslateReact from "../TranslateReact"
import getMonitorName from "../utils/BrightnessPanel/getMonitorName";

const updatesDisabled = window.updatesDisabled === true

function formatResolutionMode(mode, showRefreshRate = true) {
  if (!mode?.width || !mode?.height) return ""
  const refreshRate = mode.refreshRate ?? mode.displayFrequency
  const hz = refreshRate ? ` · ${Math.round(refreshRate * 100) / 100}Hz` : ""
  const rawDetails = window.settings?.resolutionShowAllModes ? [
    mode.bitsPerPel ? `${mode.bitsPerPel}bpp` : "",
    mode.displayFlags ? `flags ${mode.displayFlags}` : "",
    mode.fixedOutput ? `fixed ${mode.fixedOutput}` : ""
  ].filter(Boolean).join(" · ") : ""
  return `${mode.width}x${mode.height}${showRefreshRate ? hz : ""}${rawDetails ? ` · ${rawDetails}` : ""}`
}

function getResolutionDisplayKey(monitor) {
  return monitor?.resolutionDisplayKey || monitor?.win32DevicePath || monitor?.key
}

function isCommonResolutionMode(mode) {
  const refreshRate = getResolutionModeRefreshRate(mode)
  return mode.isCurrent || ((mode.width || 0) >= 1280 && (mode.height || 0) >= 720 && (!refreshRate || refreshRate >= 59.5))
}

function getResolutionModeRefreshRate(mode) {
  return mode?.refreshRate ?? mode?.displayFrequency ?? 0
}

function getResolutionSizeKey(mode) {
  return `${mode?.width || 0}x${mode?.height || 0}`
}

function pickHigherRefreshMode(a, b) {
  if (!a) return b
  if (!b) return a
  const aRefreshRate = getResolutionModeRefreshRate(a)
  const bRefreshRate = getResolutionModeRefreshRate(b)
  if (bRefreshRate > aRefreshRate) return b
  if (bRefreshRate < aRefreshRate) return a
  if (b.isCurrent && !a.isCurrent) return b
  return a
}

function normalizeResolutionModesForDisplay(modes = [], favorites = [], settings = {}) {
  let normalizedModes = modes.slice(0)
  if (settings?.resolutionHideLowRefreshRates) {
    normalizedModes = normalizedModes.filter(mode => {
      const refreshRate = getResolutionModeRefreshRate(mode)
      return mode.isCurrent || !refreshRate || refreshRate >= 59.5
    })
  }
  if (settings?.resolutionShowOnlyFavorites) {
    normalizedModes = normalizedModes.filter(mode => isResolutionFavoriteMode(mode, favorites) || mode.isCurrent)
  }
  if (settings?.resolutionShowRefreshRate === false) {
    const modesBySize = new Map()
    for (const mode of normalizedModes) {
      if (!mode?.width || !mode?.height) continue
      const sizeKey = getResolutionSizeKey(mode)
      modesBySize.set(sizeKey, pickHigherRefreshMode(modesBySize.get(sizeKey), mode))
    }
    normalizedModes = Array.from(modesBySize.values())
  }
  return normalizedModes
}

function resolutionModeRenderKey(mode) {
  return [
    formatResolutionFavoriteKey(mode),
    mode.bitsPerPel ?? "",
    mode.displayFlags ?? "",
    mode.fixedOutput ?? "",
    mode.modeIndex ?? ""
  ].join("|")
}

function ResolutionPendingChangeBar({ T, pendingChange, monitor, onConfirm, onRevert }) {
  if (!pendingChange || pendingChange.displayKey !== getResolutionDisplayKey(monitor)) return null

  return (
    <div className="resolution-pending-bar">
      <div className="resolution-pending-text">
        {pendingChange.secondsRemaining}s
      </div>
      <button onClick={() => onConfirm(pendingChange.id)}>{T.t("PANEL_RESOLUTION_KEEP_CHANGES")}</button>
      <button onClick={() => onRevert(pendingChange.id)}>{T.t("PANEL_RESOLUTION_REVERT")}</button>
    </div>
  )
}

function ResolutionModeList({ T, modesState, currentLabel, onSelect, onToggleFavorite }) {
  if (!modesState?.open) return null

  if (modesState.loading) {
    return <div className="resolution-mode-list"><div className="resolution-mode-empty">{T.t("PANEL_RESOLUTION_LOADING")}</div></div>
  }

  if (modesState.error) {
    return <div className="resolution-mode-list"><div className="resolution-mode-error">{modesState.error}</div></div>
  }

  const favorites = modesState.favorites || []
  const modes = normalizeResolutionModesForDisplay(modesState.modes || [], favorites, window.settings || {})
  if (!modes.length) {
    return <div className="resolution-mode-list"><div className="resolution-mode-empty">{T.t("PANEL_RESOLUTION_NO_MODES")}</div></div>
  }

  const favoriteModes = modes.filter(mode => isResolutionFavoriteMode(mode, favorites))
  const commonModes = modes.filter(mode => !isResolutionFavoriteMode(mode, favorites) && isCommonResolutionMode(mode))
  const otherModes = modes.filter(mode => !isResolutionFavoriteMode(mode, favorites) && !isCommonResolutionMode(mode))

  const renderGroup = (label, groupModes) => {
    if (!groupModes.length) return null
    return (
      <div className="resolution-mode-group" key={label}>
        <div className="resolution-mode-group-title">{label}</div>
        {groupModes.map((mode) => {
          const label = formatResolutionMode(mode, window.settings?.resolutionShowRefreshRate)
          const isFavorite = isResolutionFavoriteMode(mode, favorites)
          return (
            <button
              key={resolutionModeRenderKey(mode)}
              className="resolution-mode-item"
              data-current={mode.isCurrent || label === currentLabel}
              onClick={() => onSelect(mode)}
            >
              <span>{label}</span>
              <span className="resolution-mode-actions">
                {mode.isCurrent || label === currentLabel ? <span className="resolution-mode-check">&#xE73E;</span> : null}
                <span
                  className="resolution-mode-favorite"
                  data-active={isFavorite}
                  title={T.t(isFavorite ? "PANEL_RESOLUTION_REMOVE_FAVORITE" : "PANEL_RESOLUTION_ADD_FAVORITE")}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    onToggleFavorite(mode)
                  }}
                >
                  {isFavorite ? "\uE735" : "\uE734"}
                </span>
              </span>
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div className="resolution-mode-list">
      {renderGroup(T.t("PANEL_RESOLUTION_FAVORITES"), favoriteModes)}
      {renderGroup(T.t("PANEL_RESOLUTION_COMMON"), commonModes)}
      {renderGroup(T.t("PANEL_RESOLUTION_ALL_MODES"), otherModes)}
    </div>
  )
}

function formatResolutionFavoriteKey(mode) {
  return `${mode.width}x${mode.height}@${Math.round((mode.refreshRate ?? mode.displayFrequency ?? 0) * 100) / 100}`
}

function getResolutionFavoriteKey(favorite) {
  if (!favorite) return ""
  if (typeof favorite === "string") return favorite
  if (!favorite.width || !favorite.height) return ""
  return favorite?.key || formatResolutionFavoriteKey(favorite)
}

function isResolutionFavoriteMode(mode, favorites = []) {
  return favorites.some(favorite => {
    if (typeof favorite === "string") return favorite === formatResolutionFavoriteKey(mode)
    if (getResolutionFavoriteKey(favorite) !== formatResolutionFavoriteKey(mode)) return false
    return (favorite.bitsPerPel === undefined || mode.bitsPerPel === favorite.bitsPerPel) &&
      (favorite.displayFlags === undefined || mode.displayFlags === favorite.displayFlags) &&
      (favorite.fixedOutput === undefined || mode.fixedOutput === favorite.fixedOutput)
  })
}

function createResolutionFavorite(mode) {
  return {
    key: formatResolutionFavoriteKey(mode),
    width: mode.width,
    height: mode.height,
    refreshRate: mode.refreshRate ?? mode.displayFrequency,
    displayFrequency: mode.displayFrequency ?? mode.refreshRate,
    bitsPerPel: mode.bitsPerPel,
    displayFlags: mode.displayFlags,
    fixedOutput: mode.fixedOutput
  }
}

function localizeResolutionError(T, error) {
  const message = error?.message || error
  if (message === "A resolution change is already waiting for confirmation.") {
    return T.t("PANEL_RESOLUTION_PENDING_EXISTS")
  }
  return message || T.t("PANEL_RESOLUTION_ERROR")
}

function ResolutionControl({ T, monitor, modesState, pendingChange, error, onToggle, onSelect, onConfirm, onRevert, onToggleFavorite, hideLeadingIcon = false }) {
  if (!window.settings?.resolutionControlsEnabled || !monitor?.resolution?.width || !getResolutionDisplayKey(monitor)) return null

  const currentLabel = formatResolutionMode(monitor.resolution, window.settings?.resolutionShowRefreshRate)

  return (
    <div className="resolution-control">
      <div className="resolution-segment">
        <button className="resolution-current" onClick={() => onToggle(monitor)}>
          {!hideLeadingIcon ? <span className="resolution-icon">&#xE7F4;</span> : null}
          <span className="resolution-label">{currentLabel}</span>
        </button>
        <button className="resolution-expand" title={T.t("PANEL_RESOLUTION_EXPAND")} onClick={() => onToggle(monitor)}>
          <span>&#xE70D;</span>
        </button>
      </div>
      <ResolutionModeList T={T} modesState={modesState} currentLabel={currentLabel} onSelect={(mode) => onSelect(monitor, mode)} onToggleFavorite={(mode) => onToggleFavorite(monitor, mode)} />
      {error ? <div className="resolution-error">{error}</div> : null}
      <ResolutionPendingChangeBar T={T} pendingChange={pendingChange} monitor={monitor} onConfirm={onConfirm} onRevert={onRevert} />
    </div>
  )
}

const BrightnessPanel = memo(function BrightnessPanel() {

  const [state, setState] = useState({
    monitors: [],
    linkedLevelsActive: false,
    names: {},
    update: false,
    sleeping: false,
    updateProgress: 0,
    isRefreshing: window.isRefreshing,
    resolutionModes: {},
    resolutionPendingChange: window.pendingResolutionChange,
    resolutionErrors: {}
  })
  const [doBackgroundEvent, setDoBackgroundEvent] = useState(false)
  const [levelsChanged, setLevelsChanged] = useState(false)
  const [init, setInit] = useState(false)
  const [lastLevels, setLastLevels] = useState([])
  const [T] = useState(new TranslateReact({}, {}))

  const numMonitors = useMemo(() => {
    let localNumMonitors = 0
    for (let key in state.monitors) {
      if ((state.monitors[key].type != "none" || state.monitors[key].hdr === "active") && !(window.settings?.hideDisplays?.[key] === true)) localNumMonitors++;
    }
    return localNumMonitors
  }, [state.monitors])

  let updateInterval = null
  let panelHeight = -1

  // Enable/Disable linked levels
  const toggleLinkedLevels = () => {
    const linkedLevelsActive = (state.linkedLevelsActive ? false : true)
    setState(prev => ({ ...prev, linkedLevelsActive }))
    window.sendSettings({
      linkedLevelsActive
    })
  }

  // Handle <Slider> changes
  const handleChange = (level, slider) => {
    const monitors = { ...state.monitors }
    const sliderMonitor = monitors[slider.props.hwid]
    if (numMonitors && state.linkedLevelsActive) {
      // Update all monitors (linked)
      for (let key in monitors) {
        const monitor = monitors[key]
        monitor.brightness = level
      }
      setState(prev => ({ ...prev, monitors }))
      setLevelsChanged(true)
      if (state.updateInterval === 999) syncBrightness()
    } else if (numMonitors > 0) {
      // Update single monitor
      if (sliderMonitor) sliderMonitor.brightness = level;
      setState(prev => ({ ...prev, monitors }))
      setLevelsChanged(true)
      if (state.updateInterval === 999) syncBrightness()
    }
    window.pauseMonitorUpdates()
  }

  // Update monitor info
  const recievedMonitors = (e) => {
    let newMonitors = { ...e.detail }
    setLastLevels([])
    // Reset panel height so it's recalculated
    panelHeight = -1
    setState(prev => ({
      ...prev,
      monitors: newMonitors
    }))
    // Delay initial adjustments
    if (!init) setTimeout(() => { setInit(true) }, 333)
  }

  const updateMinMax = (inMonitors = false) => {
    if (numMonitors > 0) {
      let newMonitors = Object.assign((inMonitors ? inMonitors : state.monitors), {})
      for (let key in newMonitors) {
        for (let remap in state.remaps) {
          if (newMonitors[key].name == remap) {
            newMonitors[key].min = state.remaps[remap].min
            newMonitors[key].max = state.remaps[remap].max
          }
        }
      }
      setLevelsChanged(true)
      if (inMonitors) {
        return inMonitors
      } else {
        setState(prev => ({
          ...prev,
          monitors: newMonitors
        }))
        setDoBackgroundEvent(true)
      }
    }
  }

  // Update settings
  const recievedSettings = (e) => {
    const settings = e.detail
    const linkedLevelsActive = (settings.linkedLevelsActive ?? false)
    const sleepAction = (settings.sleepAction ?? "none")
    const updateInterval = (settings.updateInterval || 500) * 1
    const remaps = (settings.remaps || {})
    const names = (settings.names || {})
    setLevelsChanged(true)
    setState(prev => ({
      ...prev,
      linkedLevelsActive,
      remaps,
      names,
      updateInterval,
      sleepAction,
      resolutionModes: Object.fromEntries(Object.entries(prev.resolutionModes || {}).map(([displayKey, modeState]) => [
        displayKey,
        {
          ...modeState,
          favorites: settings.resolutionFavorites?.[displayKey] || []
        }
      ]))
    }))
    resetBrightnessInterval()
    updateMinMax()
    setDoBackgroundEvent(true)
  }

  const recievedUpdate = (e) => {
    const update = e.detail
    setState(prev => ({ ...prev, update }))
  }

  const recievedSleep = (e) => {
    setState(prev => ({ ...prev, sleeping: e.detail }))
  }

  const handleResolutionPendingChange = (e) => {
    setState(prev => ({ ...prev, resolutionPendingChange: e.detail }))
  }

  const handleResolutionError = (e) => {
    const displayKey = e.detail?.displayKey || e.detail?.operation || "global"
    setState(prev => ({
      ...prev,
      resolutionErrors: {
        ...prev.resolutionErrors,
        [displayKey]: localizeResolutionError(T, e.detail?.error || e.detail)
      }
    }))
  }

  const getResolutionKey = getResolutionDisplayKey

  const updateResolutionModesState = (displayKey, patch) => {
    setState(prev => ({
      ...prev,
      resolutionModes: {
        ...prev.resolutionModes,
        [displayKey]: {
          ...(prev.resolutionModes?.[displayKey] || {}),
          ...patch
        }
      }
    }))
  }

  const clearResolutionError = (displayKey) => {
    setState(prev => {
      const resolutionErrors = { ...(prev.resolutionErrors || {}) }
      delete resolutionErrors[displayKey]
      delete resolutionErrors.global
      return { ...prev, resolutionErrors }
    })
  }

  const toggleResolutionModes = async (monitor) => {
    const displayKey = getResolutionKey(monitor)
    if (!displayKey) return

    const current = state.resolutionModes?.[displayKey]
    if (current?.open) {
      updateResolutionModesState(displayKey, { open: false })
      return
    }

    clearResolutionError(displayKey)
    updateResolutionModesState(displayKey, { open: true, loading: true, error: false })
    try {
      const result = await window.resolution.listModes(displayKey)
      updateResolutionModesState(displayKey, {
        open: true,
        loading: false,
        modes: result?.modes || [],
        favorites: window.settings?.resolutionFavorites?.[displayKey] || [],
        error: false
      })
    } catch (error) {
      updateResolutionModesState(displayKey, {
        open: true,
        loading: false,
        error: error?.message || T.t("PANEL_RESOLUTION_LOAD_FAILED")
      })
    }
  }

  const selectResolutionMode = async (monitor, mode) => {
    const displayKey = getResolutionKey(monitor)
    if (!displayKey) return
    clearResolutionError(displayKey)
    updateResolutionModesState(displayKey, { applying: true })
    try {
      const favorites = state.resolutionModes?.[displayKey]?.favorites || window.settings?.resolutionFavorites?.[displayKey] || []
      await window.resolution.applyMode(displayKey, mode, { direct: isResolutionFavoriteMode(mode, favorites) })
      updateResolutionModesState(displayKey, { open: false, applying: false })
    } catch (error) {
      updateResolutionModesState(displayKey, { applying: false })
      setState(prev => ({
        ...prev,
        resolutionErrors: {
          ...prev.resolutionErrors,
          [displayKey]: localizeResolutionError(T, error)
        }
      }))
    }
  }

  const toggleResolutionFavorite = (monitor, mode) => {
    const displayKey = getResolutionKey(monitor)
    if (!displayKey) return
    const resolutionFavorites = { ...(window.settings?.resolutionFavorites || {}) }
    const favorites = resolutionFavorites[displayKey] || []
    const existingIndex = favorites.findIndex(favorite => isResolutionFavoriteMode(mode, [favorite]))
    if (existingIndex >= 0) {
      resolutionFavorites[displayKey] = favorites.filter((_, index) => index !== existingIndex)
    } else {
      resolutionFavorites[displayKey] = [...favorites, createResolutionFavorite(mode)]
    }
    window.settings.resolutionFavorites = resolutionFavorites
    updateResolutionModesState(displayKey, { favorites: resolutionFavorites[displayKey] })
    window.sendSettings({ resolutionFavorites })
  }

  const confirmResolutionChange = async (id) => {
    try {
      await window.resolution.confirmChange(id)
    } catch (error) {
      setState(prev => ({
        ...prev,
        resolutionErrors: {
          ...prev.resolutionErrors,
          global: localizeResolutionError(T, error)
        }
      }))
    }
  }

  const revertResolutionChange = async (id) => {
    try {
      await window.resolution.revertChange(id)
    } catch (error) {
      setState(prev => ({
        ...prev,
        resolutionErrors: {
          ...prev.resolutionErrors,
          global: error?.message || T.t("PANEL_RESOLUTION_REVERT_FAILED")
        }
      }))
    }
  }

  const renderResolutionControl = (monitor, options = {}) => (
    <ResolutionControl
      T={T}
      monitor={monitor}
      modesState={state.resolutionModes?.[getResolutionKey(monitor)]}
      pendingChange={state.resolutionPendingChange}
      error={state.resolutionErrors?.[getResolutionKey(monitor)] || state.resolutionErrors?.global}
      onToggle={toggleResolutionModes}
      onSelect={selectResolutionMode}
      onConfirm={confirmResolutionChange}
      onRevert={revertResolutionChange}
      onToggleFavorite={toggleResolutionFavorite}
      hideLeadingIcon={options.hideLeadingIcon}
    />
  )

  const getSortedMonitors = () => Object.values(state.monitors || {}).slice(0).sort((a, b) => {
    const aSort = (a.order === undefined ? 999 : a.order * 1)
    const bSort = (b.order === undefined ? 999 : b.order * 1)
    return aSort - bSort
  })

  const renderLinkedResolutionControls = () => getSortedMonitors().map((monitor) => {
    if ((monitor.type == "none" && monitor.hdr !== "active") || window.settings?.hideDisplays?.[monitor.key] === true || !getResolutionDisplayKey(monitor)) return null
    return (
      <div className="resolution-linked-row" key={`resolution-${monitor.key}`}>
        <div className="resolution-linked-name">{getMonitorName(monitor, state.names)}</div>
        {renderResolutionControl(monitor)}
      </div>
    )
  })



  // Send new brightness to monitors, if changed
  const syncBrightness = () => {
    const monitors = state.monitors
    if (init && levelsChanged && (window.showPanel || doBackgroundEvent) && numMonitors) {
      setDoBackgroundEvent(false)
      setLevelsChanged(false)
      try {
        for (let idx in monitors) {
          if (monitors[idx].type != "none" && monitors[idx].brightness != lastLevels[idx]) {
            window.updateBrightness(monitors[idx].id, monitors[idx].brightness)
          }
        }
      } catch (e) {
        console.error("Could not update brightness")
      }
    }
  }

  const resetBrightnessInterval = () => {
    if (updateInterval) clearInterval(updateInterval)
    updateInterval = setInterval(() => syncBrightness(), (state.updateInterval || 500))
  }

  const handleIsRefreshingUpdate = (e) => setState(prev => ({ ...prev, isRefreshing: e.detail }))
  const handleUpdateProgress = (e) => setState(prev => ({ ...prev, updateProgress: e.detail.progress }))

  useEffect(() => {
    resetBrightnessInterval()
    return () => {
      clearInterval(updateInterval)
    }
  }, [state.monitors, numMonitors, doBackgroundEvent, levelsChanged, init])


  useEffect(() => {
    window.addEventListener("monitorsUpdated", (e) => recievedMonitors(e))
    window.addEventListener("settingsUpdated", (e) => recievedSettings(e))
    window.addEventListener("localizationUpdated", (e) => T.setLocalizationData(e.detail.desired, e.detail.default))
    window.addEventListener("sleepUpdated", (e) => recievedSleep(e))
    window.addEventListener("isRefreshing", (e) => handleIsRefreshingUpdate(e))
    window.addEventListener("resolutionPendingChange", handleResolutionPendingChange)
    window.addEventListener("resolutionError", handleResolutionError)

    if (window.isAppX === false && !updatesDisabled) {
      window.addEventListener("updateUpdated", (e) => recievedUpdate(e))
      window.addEventListener("updateProgress", (e) => handleUpdateProgress(e))
    }

    // Update brightness every interval, if changed
    window.requestSettings()
    window.requestMonitors()
    window.resolution?.requestPendingChange?.()
    window.ipc.send('request-localization')
    window.reactReady = true

    return () => {
      window.removeEventListener("monitorsUpdated")
      window.removeEventListener("settingsUpdated")
      window.removeEventListener("localizationUpdated")
      window.removeEventListener("sleepUpdated")
      window.removeEventListener("isRefreshing")
      window.removeEventListener("resolutionPendingChange", handleResolutionPendingChange)
      window.removeEventListener("resolutionError", handleResolutionError)
      window.removeEventListener("updateUpdated")
      window.removeEventListener("updateProgress")
    }
  }, [])

  useEffect(() => {
    const height = window.document.getElementById("panel").offsetHeight
    if (panelHeight != height) {
      panelHeight = height
      window.sendHeight(height)
    }
  })

  const getMonitors = () => {
    if (!state.monitors || numMonitors == 0) {
      if (state.isRefreshing) {
        return (<div className="no-displays-message" style={{ textAlign: "center", paddingBottom: "15px" }}>{T.t("GENERIC_DETECTING_DISPLAYS")}</div>)
      }
      return (<div className="no-displays-message">{T.t("GENERIC_NO_COMPATIBLE_DISPLAYS")}</div>)
    } else {
      if (state.linkedLevelsActive) {
        // Combine all monitors
        let lastValidMonitor
        for(const key in state.monitors) {
          const monitor = state.monitors[key]
          if(monitor.type == "wmi" || monitor.type == "studio-display" || (monitor.type == "ddcci" && monitor.brightnessType) || monitor.hdr === "active") {
           lastValidMonitor = monitor 
          }
        }
        if (lastValidMonitor) {
          const monitor = lastValidMonitor
          return (
            <>
              <Slider name={T.t("GENERIC_ALL_DISPLAYS")} id={monitor.id} level={monitor.brightness} min={0} max={100} num={monitor.num} monitortype={monitor.type} hwid={monitor.key} key={monitor.key} onChange={handleChange} scrollAmount={window.settings?.scrollFlyoutAmount} />
              {renderLinkedResolutionControls()}
            </>
          )
        }
        return (<div className="no-displays-message">{T.t("GENERIC_NO_COMPATIBLE_DISPLAYS")}</div>)
      } else {
        // Show all valid monitors individually
        const sorted = getSortedMonitors()
        let useFeatures = false
        // Check if we should use the extended DDC/CI layout or simple layout
        for (const { hwid } of sorted) {
          const monitorFeatures = window.settings?.monitorFeatures?.[hwid[1]]
          for (const vcp in monitorFeatures) {
            if (vcp == "0x10" || vcp == "0x13" || vcp == "0xD6") {
              continue; // Skip if brightness or power state
            }
            const feature = monitorFeatures[vcp]
            if (feature) {
              // Feature is active
              // Now we check if there are any settings active for the feature
              const featureSettings = window.settings.monitorFeaturesSettings?.[hwid[1]]
              if (!(featureSettings?.[vcp]?.linked)) {
                // Isn't linked
                useFeatures = true
              }
            }
          }
        }

        return sorted.map((monitor) => {
          if ((monitor.type == "none" && monitor.hdr !== "active") || window.settings?.hideDisplays?.[monitor.key] === true) {
            return (<div key={monitor.key}></div>)
          } else {
            if (monitor.type == "wmi" || monitor.type == "studio-display" || (monitor.type == "ddcci" && monitor.brightnessType) || monitor.hdr === "active") {

              let hasFeatures = true
              let featureCount = 0
              const monitorFeatures = window.settings?.monitorFeatures?.[monitor.hwid[1]]
              const features = ["0x12", "0xD6", "0x62"]
              if (monitor.features) {
                features.forEach(f => {
                  // Check monitor features
                  if (monitor.features[f] && monitor.features[f].length > 1) {
                    // Check that user has enabled feature
                    if (monitorFeatures && monitorFeatures[f]) {
                      // Track feature
                      hasFeatures = true
                      featureCount++
                    }
                  }
                })
              }
              let showHDRSliders = false
              if((monitor.hdr === "active" || window.settings?.hdrDisplays?.[monitor.key]) && !(window.settings?.sdrAsMainSliderDisplays?.[monitor.key])) {
                // Has HDR slider enabled
                hasFeatures = true
                useFeatures = true
                showHDRSliders = true
              }
              const powerOff = () => {
                window.ipc.send("sleep-display", monitor.hwid.join("#"))
                monitor.features["0xD6"][0] = (monitor.features["0xD6"][0] >= 4 ? 1 : window.settings?.ddcPowerOffValue)
              }
              const showPowerButton = () => {
                const customFeatureEnabled = window.settings?.monitorFeaturesSettings?.[monitor?.hwid[1]]?.["0xD6"]
                if (monitorFeatures?.["0xD6"] && (monitor.features?.["0xD6"] || customFeatureEnabled)) {
                  return (<div className="feature-power-icon simple" onClick={powerOff}><span className="icon vfix">&#xE7E8;</span><span>{(monitor.features?.["0xD6"][0] >= 4 ? T.t("PANEL_LABEL_TURN_ON") : T.t("PANEL_LABEL_TURN_OFF"))}</span></div>)
                }
              }

              // Check if it's an HDR display and only supports SDR brightness adjustment.
              const isHDROnlySDR = (monitor.hdr === "active" || monitor.hdr === "supported") && monitor.type === "none";
              
              if (!useFeatures || !hasFeatures) {
                // For HDR displays that only support SDR, the HDR slider is displayed directly instead of the regular brightness slider.
                if (isHDROnlySDR) {
                  return (
                    <div className="monitor-sliders extended" key={monitor.key}>
                      <div className="monitor-item" style={{ height: "auto", paddingBottom: "18px" }}>
                        <div className="name-row">
                          <div className="icon"><span>&#xE7F4;</span></div>
                          <div className="title">{getMonitorName(monitor, state.names)}</div>
                          { showPowerButton() }
                        </div>
                      </div>
                      {renderResolutionControl(monitor)}
                      <HDRSliders monitor={monitor} scrollAmount={window.settings?.scrollFlyoutAmount} />
                    </div>
                  )
                }
                return (
                  <div className="monitor-sliders" key={monitor.key}>
                    <Slider name={getMonitorName(monitor, state.names)} id={monitor.id} level={monitor.brightness} min={0} max={100} num={monitor.num} monitortype={monitor.type} hwid={monitor.key} key={monitor.key} onChange={handleChange} afterName={showPowerButton()} scrollAmount={window.settings?.scrollFlyoutAmount} />
                    {renderResolutionControl(monitor)}
                  </div>
                )
              } else {
                return (
                  <div className="monitor-sliders extended" key={monitor.key}>
                    <div className="monitor-item" style={{ height: "auto", paddingBottom: "18px" }}>
                      <div className="name-row">
                        <div className="icon">{(monitor.type == "wmi" ? <span>&#xE770;</span> : <span>&#xE7F4;</span>)}</div>
                        <div className="title">{getMonitorName(monitor, state.names)}</div>
                        {showPowerButton()}
                      </div>
                    </div>
                    {/* For HDR displays that only support SDR, hide the regular brightness slider. */}
                    { !isHDROnlySDR && (
                      <div className="feature-row feature-brightness">
                        <div className="feature-icon"><span className="icon vfix">&#xE706;</span></div>
                        <Slider id={monitor.id} level={monitor.brightness} min={0} max={100} num={monitor.num} monitortype={monitor.type} hwid={monitor.key} key={monitor.key} onChange={handleChange} scrollAmount={window.settings?.scrollFlyoutAmount} />
                      </div>
                    )}
                    <div className="feature-row resolution-feature-row">
                      <div className="feature-icon"><span className="icon vfix">&#xE7F4;</span></div>
                      {renderResolutionControl(monitor, { hideLeadingIcon: true })}
                    </div>
                    <DDCCISliders monitor={monitor} monitorFeatures={monitorFeatures} scrollAmount={window.settings?.scrollFlyoutAmount} />
                    {showHDRSliders ? <HDRSliders monitor={monitor} scrollAmount={window.settings?.scrollFlyoutAmount} /> : null}
                  </div>
                )
              }
            }
          }
        })
      }
    }
  }

  return (
    <div className="window-base" data-theme={window.settings.theme || "default"} id="panel" data-refreshing={state.isRefreshing}>
      <div className="titlebar">
        <div className="title">{T.t("PANEL_TITLE")}</div>
        <div className="icons">
          {
            numMonitors > 1 &&
            <div
              title={T.t("PANEL_BUTTON_LINK_LEVELS")}
              data-active={state.linkedLevelsActive}
              onClick={toggleLinkedLevels}
              className="link">
              &#xE71B;
            </div>
          }
          {
            window.settings.sleepAction !== "none" &&
            <div
              title={T.t("PANEL_BUTTON_TURN_OFF_DISPLAYS")}
              className="off"
              onClick={window.turnOffDisplays}>
              &#xF71D;
            </div>
          }
          <div title={T.t("GENERIC_SETTINGS")} className="settings" onClick={window.openSettings}>&#xE713;</div>
        </div>
      </div>
      {state.sleeping ? (<div></div>) : getMonitors()}
      {
        !updatesDisabled && (state.update && state.update.show)
          ?
          <div className="updateBar">
            <div className="left">
              {T.t("PANEL_UPDATE_AVAILABLE")}
              ({state.update.version})
            </div>
            <div className="right">
              <a onClick={window.installUpdate}>
                {T.t("GENERIC_INSTALL")}
              </a>
              <a className="icon" title={T.t("GENERIC_DISMISS")} onClick={window.dismissUpdate}>
                &#xEF2C;
              </a>
            </div>
          </div>
          :
          !updatesDisabled && (state.update && state.update.downloading)
          &&
          <div className="updateBar">
            <div className="left progress">
              <div className="progress-bar">
                <div style={{ width: `${state.updateProgress}%` }}>
                </div>
              </div>
            </div>
            <div className="right">
              {state.updateProgress}%
            </div>
          </div>
      }
      <div id="mica">
        <div className="displays" style={{ visibility: window.micaState.visibility }}>
          <div className="blur">
            <img alt="" src={window.micaState.src} width="2560" height="1440" />
          </div>
        </div>
        <div className="noise"></div>
      </div>
    </div>
  )
})

export default BrightnessPanel
