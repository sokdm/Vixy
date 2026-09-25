#include "morphly/morphly_ids.h"

namespace morphly
{
    const GUID kVirtualCameraSourceClsid =
    { 0x6cb9df61, 0x861f, 0x4fc0, { 0x91, 0xeb, 0x43, 0xd2, 0x0d, 0x44, 0xd7, 0x91 } };

    const GUID kWindowsVirtualCameraSourceClsid =
    { 0xd8761762, 0x5f50, 0x4d3c, { 0xae, 0x97, 0x15, 0xbb, 0x07, 0x90, 0x4d, 0x9e } };

    const wchar_t* const kVirtualCameraFriendlyName = L"Vixy Virtual Camera";
    const wchar_t* const kPublisherMappingName = L"Local\\VixyCam.FrameBuffer";
    const wchar_t* const kPublisherMutexName = L"Local\\VixyCam.FrameMutex";
    const wchar_t* const kPublisherEventName = L"Local\\VixyCam.FrameEvent";
    const wchar_t* const kGlobalPublisherMappingName = L"Global\\VixyCam.FrameBuffer";
    const wchar_t* const kGlobalPublisherMutexName = L"Global\\VixyCam.FrameMutex";
    const wchar_t* const kGlobalPublisherEventName = L"Global\\VixyCam.FrameEvent";
    const wchar_t* const kMfPublisherBridgeDirectoryPath = L"C:\\Users\\Public\\Documents\\VixyG1";
    const wchar_t* const kMfPublisherBridgeFilePath = L"C:\\Users\\Public\\Documents\\VixyG1\\mf-bridge.bin";
}
