Name:    hawkinit
Version: 1.3.2
Release: 1%{?dist}
Summary: Hawkinit CLI Tool
URL: https://github.com/Jiri-Kremser/hawkinit
License: ASL 2.0
#Source0: https://github.com/Jiri-Kremser/hawkinit/archive/%{version}.tar.gz
Source0: hawkinit-1.3.2.tar.gz
#BuildRequires: nodejs-packaging
BuildRequires: nodejs-packaging
BuildArch: noarch
AutoReq: no
AutoProv: no

%description
CLI tool that sets up the Hawkular Services together with couple of servers to monitor

%prep
%autosetup -n %{name}

%build
#noop

%install
mkdir -p %{buildroot}/usr/lib/node_modules/hawkinit
mkdir -p %{buildroot}/%{_bindir}
cp -prf * %{buildroot}/usr/lib/node_modules/hawkinit
ln -s /usr/lib/node_modules/hawkinit/index.js %{buildroot}/%{_bindir}/hawkinit

%files
/usr/lib/node_modules/hawkinit
%{_bindir}/hawkinit

%changelog
* Mon Jan 16 2017 Jiri Kremser <jkremser at redhat.com> - 1.3.2-1
- Initial rpm packaging
