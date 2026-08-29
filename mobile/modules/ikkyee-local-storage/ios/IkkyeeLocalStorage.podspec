Pod::Spec.new do |s|
  s.name           = 'IkkyeeLocalStorage'
  s.version        = '0.1.0'
  s.summary        = 'Backup-excluded local storage boundary for Ikkyee.'
  s.description    = 'Creates and verifies the app-private database directory used for device photo metadata.'
  s.license        = { :type => 'MIT' }
  s.author         = 'Ikkyee'
  s.homepage       = 'https://ikkyee.com'
  s.platforms      = { :ios => '16.4' }
  s.swift_version  = '5.9'
  s.source         = { :git => 'https://ikkyee.com/ikkyee-local-storage.git', :tag => s.version.to_s }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.source_files = '**/*.{h,m,mm,swift,hpp,cpp}'
end
